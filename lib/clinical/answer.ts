import type { ClinicalAi, ClinicalSearchOptions, EvidenceRecord } from "./types";
import { conceptInFocus, isCareGuideline, isHeartFailureSlot, isType2DiabetesTitle, isVeterinary, mergeIndicationRecords, selectForSynthesis } from "./select";
import { canonicalTerm, conceptsForQuestion, conditionSearchTerms, conditionsFromGuideline, evidenceQuery, expandClassTerms, fallbackSearchTerms, finalSetKey, forceMetforminType2, isConditionTerm, isContextConcept, isIndicationQuestion, isMetforminPrediabetes, isolatedHeartFailureQuery, knownClassTerms, metforminPrediabetesQuery, pairQueries, parseJsonObject, readApprovedCard, readFinalSet, readTermCache, sanitizeConcepts, saoPauloPublicationDay, searchAttempts, writeApprovedCard, writeFinalSet, writeTermCache, type FinalSetItem, type TermCacheDb } from "./terms";
import { isYesNoQuestion } from "./prompts";
import { benefitLineCount, firstItemMissedControl, insufficientAnswer, rejectionNote, reservedCodeLine, resultSentence, sourceExcerpt, synthesisIsEmpty, synthesisNeedsRetry, validateSynthesis } from "./validate";
import type { ClinicalAnswer } from "./types";

function uniqueRecords(articles: EvidenceRecord[]) {
  const byId = new Map<string, EvidenceRecord>();
  for (const article of articles) {
    if (!byId.has(article.pmid)) byId.set(article.pmid, article);
  }
  return [...byId.values()];
}

function answerLines(answer: ClinicalAnswer) {
  const byN = new Map(answer.references.map((item) => [item.n, item.pmid]));
  return answer.answer.split("\n").flatMap((line) => {
    const pmids = [...line.matchAll(/\[(\d+)\]/g)].map((match) => byN.get(Number(match[1]))).filter((pmid): pmid is string => Boolean(pmid));
    const texto = line.replace(/\s*\[\d+\]/g, "").trim();
    if (!texto || !pmids.length) return [];
    return pmids.map((pmid) => ({ pmid, texto, care: /^cuidados\b/i.test(texto) }));
  });
}

function mergeAnswers(first: ClinicalAnswer, second: ClinicalAnswer, records: EvidenceRecord[], concept: ReturnType<typeof conceptsForQuestion>[number], question: string) {
  const order: string[] = [];
  const byPmid = new Map<string, { texto: string; pmid: string }>();
  for (const line of answerLines(first)) {
    if (!byPmid.has(line.pmid)) order.push(line.pmid);
    byPmid.set(line.pmid, { texto: line.texto, pmid: line.pmid });
  }
  for (const line of answerLines(second)) {
    if (!byPmid.has(line.pmid)) order.push(line.pmid);
    byPmid.set(line.pmid, { texto: line.texto, pmid: line.pmid });
  }
  const items = order.map((pmid) => byPmid.get(pmid)).filter((item): item is { texto: string; pmid: string } => Boolean(item));
  if (!items.length) return second.sufficient ? second : first;
  return validateSynthesis(JSON.stringify({ itens: items }), records, concept, question);
}

function normLine(value: string) {
  return value.toLowerCase().normalize("NFD").replace(/\p{M}/gu, "").replace(/[^a-z0-9]+/g, " ").trim();
}

function withReservedLines(
  answer: ClinicalAnswer,
  records: EvidenceRecord[],
  concept: ReturnType<typeof conceptsForQuestion>[number],
  question: string,
  onReplace: () => void,
) {
  const order: string[] = [];
  const texts = new Map<string, string>();
  for (const line of answerLines(answer)) {
    if (!texts.has(line.pmid)) order.push(line.pmid);
    texts.set(line.pmid, line.texto);
  }
  let changed = false;
  for (const record of records) {
    const text = reservedCodeLine(record);
    if (!text) continue;
    const current = texts.get(record.pmid);
    if (current && normLine(current) !== normLine(text)) onReplace();
    if (!texts.has(record.pmid)) order.push(record.pmid);
    if (current === text) continue;
    texts.set(record.pmid, text);
    changed = true;
  }
  if (!changed) return answer;
  const items = order.map((pmid) => ({ texto: texts.get(pmid) || "", pmid }));
  return validateSynthesis(JSON.stringify({ itens: items }), records, concept, question);
}

function reservedSlotsFilled(records: EvidenceRecord[], answer: ClinicalAnswer, question: string) {
  if (!isIndicationQuestion(question)) return true;
  const lines = answerLines(answer);
  return records.every((record) => {
    const required = Boolean(reservedCodeLine(record)) || isCareGuideline(record) || isHeartFailureSlot(record);
    if (!required) return true;
    return lines.some((line) => line.pmid === record.pmid && (!/^cuidados\b/i.test(reservedCodeLine(record)) || line.care));
  });
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
    guidelines,
    metas,
    recent: [...recent, ...paired.flat(), ...prediabetesTrials],
    supplemental,
    outcomes: [...dm2Outcomes, ...outcomes],
    heartFailure,
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
  if (input.db) {
    const cachedCard = await readApprovedCard(question, input.db);
    if (cachedCard) {
      input.onStage?.("writing");
      return cachedCard;
    }
  }
  let concepts = [] as ReturnType<typeof sanitizeConcepts>;
  try {
    const cached = input.cacheTerms ? await readTermCache(question, input.db) : "";
    const raw = cached || await input.ai.searchTerms(question);
    if (input.cacheTerms && !cached && raw.trim()) await writeTermCache(question, raw, input.db);
    concepts = sanitizeConcepts(parseJsonObject(raw));
  } catch {
    concepts = [];
  }
  const fixed = knownClassTerms(question);
  if (fixed) {
    const canonical = canonicalTerm(fixed[0]);
    const replaced = concepts.map((concept) => concept.some((term) => canonicalTerm(term) === canonical) ? fixed : concept);
    concepts = replaced.some((concept) => concept === fixed) ? replaced : [fixed, ...concepts];
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
  const setKey = finalSetKey(question, scoped);
  let records: EvidenceRecord[] = [];
  let fontes: FinalSetItem[] | null = input.db ? await readFinalSet(setKey, input.db) : null;
  input.onStage?.("pubmed");
  if (fontes?.length) {
    const fetched = await input.search(fontes.map((item) => `${item.pmid}[uid]`).join(" OR "), { kind: "high-level", includeTrials: true });
    const byId = new Map(fetched.map((record) => [record.pmid, record]));
    const ordered = fontes.map((item) => byId.get(item.pmid)).filter((record): record is EvidenceRecord => Boolean(record));
    if (ordered.length === fontes.length) records = ordered;
    else fontes = null;
  }
  if (!records.length) {
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
    fontes = records.map((record) => ({ pmid: record.pmid, excerpt: sourceExcerpt(record) }));
    if (input.db && fontes.length) await writeFinalSet(setKey, fontes, input.db);
  }
  if (!records.length) {
    return insufficientAnswer(
      "Não encontramos revisões sistemáticas, metanálises ou diretrizes no PubMed para esta pergunta. Não há conclusão clínica a partir desta busca.",
    );
  }
  try {
    input.onStage?.("reading");
    input.onStage?.("writing");
    const reserved = records.filter((record) => isCareGuideline(record) || isHeartFailureSlot(record) || isType2DiabetesTitle(record.title));
    const brief = reserved.length
      ? `\n\nEscreva uma linha para cada vaga, com o desfecho da frase. Não comece com Cuidados: o código coloca o rótulo. Não troque procedure por cirurgia.\n${reserved.map((record) => `PMID ${record.pmid}: ${resultSentence(record)}`).join("\n")}`
      : "";
    let raw = await input.ai.summarize(`${question}${brief}`, records, { direct: isYesNoQuestion(question) });
    let tainted = false;
    let retried = false;
    if (synthesisNeedsRetry(raw, records)) {
      if (validateSynthesis(raw, records, main, question).discardedCitations.length) tainted = true;
      retried = true;
      const ids = records.map((record) => record.pmid).join(", ");
      const note = synthesisIsEmpty(raw)
        ? "A lista itens veio vazia. Responda de novo com um item por achado que o trecho sustente. Não comece por sim ou não."
        : `${RETRY_WARNING} PMIDs: ${ids}.`;
      raw = await input.ai.summarize(`${question}\n\n${note}`, records, { direct: false });
    }
    const checked = (value: ClinicalAnswer) => {
      if (value.discardedCitations.length) tainted = true;
      return value;
    };
    let answer = checked(validateSynthesis(raw, records, main, question));
    answer = withReservedLines(answer, records, main, question, () => { tainted = true; });
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
        const retryRaw = await input.ai.summarize(`${question}\n\n${note}`, records, { direct: false });
        answer = checked(mergeAnswers(answer, checked(validateSynthesis(retryRaw, records, main, question)), records, main, question));
        answer = withReservedLines(answer, records, main, question, () => { tainted = true; });
      }
    }
    if (input.db && answer.sufficient && !tainted && reservedSlotsFilled(records, answer, question)) {
      await writeApprovedCard(question, { ...answer, sufficient: true }, input.db);
    }
    return answer;
  } catch {
    return insufficientAnswer(
      "A busca recuperou registros, mas a síntese falhou. Nenhuma conclusão foi produzida.",
    );
  }
}
