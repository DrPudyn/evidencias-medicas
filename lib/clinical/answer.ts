import type { ClinicalAi, ClinicalSearchOptions, EvidenceRecord } from "./types";
import { conceptInFocus, isVeterinary, mergeIndicationRecords, selectForSynthesis } from "./select";
import { conceptsForQuestion, conditionSearchTerms, conditionsFromGuideline, evidenceQuery, expandClassTerms, fallbackSearchTerms, forceMetforminType2, isConditionTerm, isContextConcept, isIndicationQuestion, isMetforminPrediabetes, isolatedHeartFailureQuery, metforminPrediabetesQuery, pairQueries, parseJsonObject, readTermCache, sanitizeConcepts, saoPauloPublicationDay, searchAttempts, writeTermCache, type TermCacheDb } from "./terms";
import { isYesNoQuestion } from "./prompts";
import { benefitLineCount, firstItemMissedControl, insufficientAnswer, rejectionNote, synthesisIsEmpty, synthesisNeedsRetry, validateSynthesis } from "./validate";

function stampRelevance(articles: EvidenceRecord[]) {
  return articles.map((article, index) => ({ ...article, relevance: article.relevance ?? index }));
}

function uniqueRecords(articles: EvidenceRecord[]) {
  const byId = new Map<string, EvidenceRecord>();
  for (const article of articles) {
    if (!byId.has(article.pmid)) byId.set(article.pmid, article);
  }
  return [...byId.values()];
}

const RETRY_WARNING = [
  "A resposta anterior foi inválida.",
  "Responda de novo somente com JSON {\"itens\":[{\"texto\":\"frase em português\",\"pmid\":\"PMID\"}]}.",
  "Cada pmid tem de ser um destes artigos.",
  "Não escreva /pmid nem [n] no texto.",
].join(" ");

async function gatherIndications(
  search: (term: string, options?: ClinicalSearchOptions) => Promise<EvidenceRecord[]>,
  scoped: ReturnType<typeof conceptsForQuestion>,
  main: ReturnType<typeof conceptsForQuestion>[number],
  question: string,
  today: string,
) {
  const searchClass = expandClassTerms(main);
  const classQuery = evidenceQuery([searchClass], today);
  const pairs = pairQueries(scoped, today).filter((term) => term !== classQuery);
  const safetyQuery = evidenceQuery([searchClass, ["adverse effects", "perioperative"]], today);
  const outcomeQuery = evidenceQuery([searchClass, ["cardiovascular outcomes", "kidney outcomes", "mortality"]], today);
  const dm2OutcomeQuery = evidenceQuery([searchClass, ["type 2 diabetes", "T2DM"], ["cardiovascular", "kidney", "renal"]], today);
  const prediabetesSearch = isMetforminPrediabetes(question)
    ? search(metforminPrediabetesQuery(today), { sort: "relevance", includeTrials: true })
    : Promise.resolve([] as EvidenceRecord[]);
  const heartFailureQuery = isolatedHeartFailureQuery(today);
  const [guidelines, metas, recent, cautions, outcomes, dm2Outcomes, heartFailure, prediabetesTrials, ...paired] = await Promise.all([
    search(classQuery, { kind: "guideline", sort: "relevance" }),
    search(classQuery, { kind: "meta", sort: "relevance" }),
    search(classQuery, { kind: "high-level", sort: "relevance" }),
    search(safetyQuery, { kind: "high-level", sort: "relevance" }),
    search(outcomeQuery, { kind: "meta", sort: "relevance" }),
    search(dm2OutcomeQuery, { kind: "meta", sort: "relevance" }),
    search(heartFailureQuery, { kind: "high-level", sort: "relevance" }),
    prediabetesSearch,
    ...pairs.map((term) => search(term, { kind: "high-level", sort: "relevance" })),
  ]);
  const supplemental: EvidenceRecord[] = [];
  const guide = guidelines.find((article) => !isVeterinary(article.title) && conceptInFocus(article, main));
  if (guide) {
    const conditions = conditionsFromGuideline(guide, question);
    if (conditions.length) {
      const extra = await Promise.all(conditions.map((condition) => condition === "type 2 diabetes"
        ? search(evidenceQuery([searchClass, conditionSearchTerms(condition), ["cardiovascular", "kidney", "heart failure"]], today), { kind: "meta", sort: "relevance" })
        : search(evidenceQuery([searchClass, conditionSearchTerms(condition)], today), { kind: "guideline", sort: "relevance" })));
      supplemental.push(...extra.flat());
    }
  }
  const merged = mergeIndicationRecords({
    guidelines: stampRelevance(guidelines),
    metas: stampRelevance(metas),
    recent: stampRelevance([...recent, ...paired.flat(), ...prediabetesTrials]),
    supplemental: stampRelevance(supplemental),
    outcomes: stampRelevance([...dm2Outcomes, ...outcomes]),
    heartFailure: stampRelevance(heartFailure),
    cautions,
    concept: main,
    question,
    limit: 6,
  });
  if (merged.length) return merged;
  for (const term of searchAttempts(scoped, today, question)) {
    const found = await search(term);
    const selected = selectForSynthesis(found, main, 6, question);
    if (selected.length) return selected;
  }
  return [];
}

export async function answerClinicalQuestion(input: {
  question: string;
  ai: ClinicalAi;
  search: (term: string, options?: ClinicalSearchOptions) => Promise<EvidenceRecord[]>;
  onStage?: (stage: "pubmed" | "reading" | "writing") => void;
  cacheTerms?: boolean;
  db?: TermCacheDb | null;
}) {
  const question = input.question.trim();
  let concepts = [] as ReturnType<typeof sanitizeConcepts>;
  try {
    const cached = input.cacheTerms ? await readTermCache(question, input.db) : "";
    const raw = cached || await input.ai.searchTerms(question);
    if (input.cacheTerms && !cached && raw.trim()) await writeTermCache(question, raw, input.db);
    concepts = sanitizeConcepts(parseJsonObject(raw));
  } catch {
    concepts = [];
  }
  if (!concepts.length) concepts = sanitizeConcepts({ terms: fallbackSearchTerms(question) });
  if (!concepts.length) {
    return insufficientAnswer(
      "Não foi possível montar uma busca no PubMed a partir desta pergunta. Nenhuma conclusão foi completada com conhecimento geral.",
    );
  }
  const today = saoPauloPublicationDay();
  let scoped = forceMetforminType2(conceptsForQuestion(concepts, question), question);
  if (!scoped.length) scoped = sanitizeConcepts({ terms: fallbackSearchTerms(question) });
  if (!scoped.length) {
    return insufficientAnswer(
      "Não foi possível montar uma busca no PubMed a partir desta pergunta. Nenhuma conclusão foi completada com conhecimento geral.",
    );
  }
  const attempts = searchAttempts(scoped, today, question);
  const main = scoped.find((concept) => !isContextConcept(concept) && !concept.every(isConditionTerm))
    || scoped.find((concept) => !isContextConcept(concept))
    || scoped[0];
  let records: EvidenceRecord[] = [];
  input.onStage?.("pubmed");
  if (isIndicationQuestion(question)) {
    records = await gatherIndications(input.search, scoped, main, question, today);
  } else {
    const pairTerms = pairQueries(scoped, today);
    const searches = pairTerms.map((term) => input.search(term));
    if (isMetforminPrediabetes(question)) searches.push(input.search(metforminPrediabetesQuery(today), { sort: "relevance", includeTrials: true }));
    if (searches.length) {
      const batches = await Promise.all(searches);
      records = selectForSynthesis(uniqueRecords(batches.flat()), main, 6, question);
    }
    if (!records.length) {
      for (const term of attempts) {
        const found = await input.search(term);
        const selected = selectForSynthesis(found, main, 6, question);
        if (selected.length) {
          records = selected;
          break;
        }
      }
    }
  }
  if (!records.length) {
    return insufficientAnswer(
      "Não encontramos revisões sistemáticas, metanálises ou diretrizes no PubMed para esta pergunta. Não há conclusão clínica a partir desta busca.",
    );
  }
  try {
    input.onStage?.("reading");
    await new Promise((resolve) => setTimeout(resolve, 40));
    input.onStage?.("writing");
    let raw = await input.ai.summarize(question, records, { direct: isYesNoQuestion(question) });
    let retried = false;
    if (synthesisNeedsRetry(raw, records)) {
      retried = true;
      const ids = records.map((record) => record.pmid).join(", ");
      const note = synthesisIsEmpty(raw)
        ? "A lista itens veio vazia. Responda de novo com um item por achado que o trecho sustente. Não comece por sim ou não."
        : `${RETRY_WARNING} PMIDs: ${ids}.`;
      raw = await input.ai.summarize(`${question}\n\n${note}`, records, { direct: false });
    }
    let answer = validateSynthesis(raw, records, main, question);
    const tooThin = () => answer.sufficient && (benefitLineCount(answer.answer) === 0 || (isIndicationQuestion(question) && benefitLineCount(answer.answer) < 2));
    const missedControl = () => isYesNoQuestion(question) && firstItemMissedControl(raw, records);
    if ((!answer.sufficient && !synthesisIsEmpty(raw)) || tooThin() || missedControl()) {
      if (!retried) {
        retried = true;
        const note = tooThin()
          ? "A resposta ficou só com Cuidados ou com menos de duas linhas de benefício. Reescreva com pelo menos duas frases de efeito, cada uma com a população do trecho."
          : missedControl()
            ? "A primeira linha tem de dizer o efeito contra placebo, controle ou sem tratamento."
            : rejectionNote(raw, records);
        raw = await input.ai.summarize(`${question}\n\n${note}`, records, { direct: false });
        answer = validateSynthesis(raw, records, main, question);
      }
    }
    return answer;
  } catch {
    return insufficientAnswer(
      "A busca recuperou registros, mas a síntese falhou. Nenhuma conclusão foi produzida.",
    );
  }
}
