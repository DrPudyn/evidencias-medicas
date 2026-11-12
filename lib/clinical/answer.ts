import type { ClinicalAi, ClinicalSearchOptions, EvidenceRecord } from "./types";
import { conceptInFocus, isCareGuideline, isHeartFailureSlot, isType2DiabetesTitle, isVeterinary, mergeIndicationRecords, selectForSynthesis } from "./select";
import { conceptsForQuestion, conditionSearchTerms, conditionsFromGuideline, evidenceQuery, expandClassTerms, fallbackSearchTerms, finalSetKey, forceMetforminType2, isConditionTerm, isContextConcept, isIndicationQuestion, isMetforminPrediabetes, isolatedHeartFailureQuery, metforminPrediabetesQuery, pairQueries, parseJsonObject, readFinalSet, readTermCache, sanitizeConcepts, saoPauloPublicationDay, searchAttempts, writeFinalSet, writeTermCache, type FinalSetItem, type TermCacheDb } from "./terms";
import { isYesNoQuestion } from "./prompts";
import { benefitLineCount, firstItemMissedControl, insufficientAnswer, rejectionNote, resultSentence, sourceExcerpt, synthesisIsEmpty, synthesisNeedsRetry, validateSynthesis } from "./validate";
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
  const items = answerLines(first).map((line) => ({ texto: line.texto, pmid: line.pmid }));
  const seen = new Set(items.map((item) => `${item.pmid}:${item.texto}`));
  for (const line of answerLines(second)) {
    const key = `${line.pmid}:${line.texto}`;
    if (seen.has(key)) continue;
    seen.add(key);
    items.push({ texto: line.texto, pmid: line.pmid });
  }
  if (!items.length) return second.sufficient ? second : first;
  return validateSynthesis(JSON.stringify({ itens: items }), records, concept, question);
}

function reservedWithoutLine(records: EvidenceRecord[], answer: ClinicalAnswer, question: string) {
  if (!isIndicationQuestion(question)) return [];
  const lines = answerLines(answer);
  return records.filter((record) => {
    const cited = lines.filter((line) => line.pmid === record.pmid);
    if (isCareGuideline(record)) return !cited.some((line) => line.care);
    if (isHeartFailureSlot(record) || isType2DiabetesTitle(record.title)) return cited.length === 0;
    return false;
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

function pinSources(raw: string, fontes: FinalSetItem[]) {
  try {
    const parsed = JSON.parse(raw) as { itens?: Array<{ pmid?: string; trecho?: string }> };
    if (!Array.isArray(parsed.itens)) return raw;
    for (const item of parsed.itens) {
      const id = String(item.pmid || "").replace(/\D/g, "");
      const fonte = fontes.find((entry) => entry.pmid === id);
      if (fonte) item.trecho = fonte.excerpt;
    }
    return JSON.stringify(parsed);
  } catch {
    return raw;
  }
}

function withoutPmids(answer: ClinicalAnswer, pmids: Set<string>, records: EvidenceRecord[], concept: ReturnType<typeof conceptsForQuestion>[number], question: string) {
  const items = answerLines(answer).filter((line) => !pmids.has(line.pmid)).map((line) => ({ texto: line.texto, pmid: line.pmid }));
  if (!items.length) return insufficientAnswer("A tradução não ficou fiel à frase de resultado. Nenhuma conclusão foi produzida.");
  return validateSynthesis(JSON.stringify({ itens: items }), records, concept, question);
}

async function unfaithful(answer: ClinicalAnswer, fontes: FinalSetItem[], verify: NonNullable<ClinicalAi["verify"]>) {
  const pairs = answerLines(answer).flatMap((line) => {
    const fonte = fontes.find((entry) => entry.pmid === line.pmid)?.excerpt || "";
    return fonte ? [{ pmid: line.pmid, texto: line.texto, fonte }] : [];
  });
  if (!pairs.length) return new Set<string>();
  try {
    const parsed = JSON.parse(await verify(pairs)) as { itens?: Array<{ pmid?: string; fiel?: boolean }> };
    const bad = new Set<string>();
    for (const item of parsed.itens || []) {
      if (item?.fiel === false) bad.add(String(item.pmid || "").replace(/\D/g, ""));
    }
    return bad;
  } catch {
    return new Set<string>();
  }
}

async function translateRecords(
  input: { ai: ClinicalAi },
  question: string,
  records: EvidenceRecord[],
  fontes: FinalSetItem[],
  main: ReturnType<typeof conceptsForQuestion>[number],
) {
  const translate = input.ai.translate;
  if (!translate) throw new Error("tradução ausente");
  const ask = (note: string, pairs: FinalSetItem[]) => translate(
    note ? `${question}\n${note}` : question,
    pairs.map((pair) => ({ pmid: pair.pmid, fonte: pair.excerpt })),
  );
  let answer = validateSynthesis(pinSources(await ask("", fontes), fontes), records, main, question);
  let retried = false;
  const repair = async (pairs: FinalSetItem[], note: string) => {
    if (!pairs.length || retried) return;
    retried = true;
    const subset = records.filter((record) => pairs.some((pair) => pair.pmid === record.pmid));
    let retry = validateSynthesis(pinSources(await ask(note, pairs), fontes), subset, main, question);
    if (input.ai.verify && retry.sufficient) {
      const bad = await unfaithful(retry, fontes, input.ai.verify);
      if (bad.size) retry = withoutPmids(retry, bad, records, main, question);
    }
    answer = mergeAnswers(answer, retry, records, main, question);
  };
  if (input.ai.verify && answer.sufficient) {
    const bad = await unfaithful(answer, fontes, input.ai.verify);
    if (bad.size) {
      answer = withoutPmids(answer, bad, records, main, question);
      await repair(
        fontes.filter((pair) => bad.has(pair.pmid)),
        "A tradução anterior foi infiel. Traduza de novo só a frase-fonte, sem desfecho extra, sem ampliar a população e sem inverter a polaridade.",
      );
    }
  }
  const missing = reservedWithoutLine(records, answer, question);
  if (missing.length) {
    await repair(
      fontes.filter((pair) => missing.some((record) => record.pmid === pair.pmid)),
      "Faltou a linha desta frase. Traduza só ela. Se a frase for de omissão ou suspensão, comece com Cuidados:.",
    );
  }
  return answer;
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
  const pinned = fontes ?? records.map((record) => ({ pmid: record.pmid, excerpt: sourceExcerpt(record) }));
  try {
    input.onStage?.("reading");
    input.onStage?.("writing");
    if (input.ai.translate) return await translateRecords(input, question, records, pinned, main);
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
        const retryRaw = await input.ai.summarize(`${question}\n\n${note}`, records, { direct: false });
        answer = mergeAnswers(answer, validateSynthesis(retryRaw, records, main, question), records, main, question);
      }
    }
    const missing = reservedWithoutLine(records, answer, question);
    if (missing.length) {
      const brief = missing.map((record) => `PMID ${record.pmid}: ${resultSentence(record)}`).join("\n");
      const extraRaw = await input.ai.summarize(
        `Escreva só uma linha por PMID, com o desfecho da frase de resultado. Se a frase for de omissão ou suspensão, comece com Cuidados:.\n${brief}`,
        missing,
        { direct: false },
      );
      answer = mergeAnswers(answer, validateSynthesis(extraRaw, missing, main, question), records, main, question);
    }
    return answer;
  } catch {
    return insufficientAnswer(
      "A busca recuperou registros, mas a síntese falhou. Nenhuma conclusão foi produzida.",
    );
  }
}
