import type { EvidenceRecord } from "./types";
import type { SearchConcept } from "./terms";

const WEAK_TOKENS = new Set([
  "inhibitor", "inhibitors", "sodium", "glucose", "transporter", "type", "disease", "diseases",
  "chronic", "drug", "drugs", "agent", "agents", "oral", "receptor", "receptors", "therapy",
  "treatment", "syndrome",
]);

const MONTHS: Record<string, number> = {
  jan: 1, feb: 2, mar: 3, apr: 4, may: 5, jun: 6,
  jul: 7, aug: 8, sep: 9, oct: 10, nov: 11, dec: 12,
};

export function publicationStamp(date: string) {
  const year = date.match(/\b(?:19|20)\d{2}\b/);
  if (!year) return 0;
  const month = date.toLowerCase().match(/jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec/);
  return Number(year[0]) * 100 + (month ? MONTHS[month[0]] : 0);
}

function typeRank(type: string) {
  const value = type.toLowerCase();
  if (value.includes("diretriz") || value.includes("guideline")) return 0;
  if (value.includes("sistemática") || value.includes("systematic")) return 1;
  if (value.includes("meta")) return 2;
  return 3;
}

function distinctiveTokens(term: string) {
  return term.toLowerCase().split(/[^a-z0-9]+/).filter((token) => token.length >= 4 && !WEAK_TOKENS.has(token));
}

/** Class MeSH names that titles almost never spell out. Documented equivalents, not indication lists. */
export function classAliases(text: string) {
  const folded = text.toLowerCase().replace(/[‐–—]/g, "-");
  const aliases: string[] = [];
  if (/sodium[-\s]?glucose(?:\s+co-?|\s+co\s)?\s*transporter(?:-|\s)?2/.test(folded) || /sglt-?2|gliflozin/.test(folded)) {
    aliases.push("sglt2", "sglt-2", "gliflozin");
  }
  if (/dipeptidyl[-\s]peptidase(?:-|\s)?4|\bdpp-?4\b/.test(folded)) aliases.push("dpp-4", "dpp4");
  if (/glucagon[-\s]like peptide(?:-|\s)?1|\bglp-?1\b/.test(folded)) aliases.push("glp-1", "glp1");
  if (/angiotensin[-\s]converting enzyme|\bace inhibitors?\b/.test(folded)) aliases.push("ace inhibitor");
  return aliases;
}

export function conceptNeedles(concept: SearchConcept) {
  const needles = new Set<string>();
  for (const synonym of concept) {
    const phrase = synonym.toLowerCase();
    if (phrase.length >= 4) needles.add(phrase);
    for (const token of distinctiveTokens(phrase)) needles.add(token);
    for (const alias of classAliases(phrase)) needles.add(alias);
  }
  return [...needles];
}

export function mentionsConcept(article: Pick<EvidenceRecord, "title" | "abstract">, concept: SearchConcept) {
  const haystack = `${article.title} ${article.abstract}`.toLowerCase();
  return conceptNeedles(concept).some((needle) => haystack.includes(needle));
}

function foldText(value: string) {
  return value.toLowerCase().normalize("NFD").replace(/\p{M}/gu, "");
}

function indicationQuestion(question: string) {
  return /indica/.test(foldText(question));
}

function safetyOnly(article: EvidenceRecord) {
  const title = foldText(article.title);
  const safety = /bone|fracture|osso|fratura|ketoacidosis|cetoacidose|amputation|amputacao|adverse effect|safety/.test(title);
  const efficacy = /efficacy|effectiveness|mortality|hospitalization|cardiovascular|kidney|heart failure|outcome|indication/.test(title);
  return safety && !efficacy;
}

function combinationOnly(article: EvidenceRecord) {
  return /combination|combined|combinad|associad|\bplus\b/.test(foldText(article.title));
}

function byDateThenPmid(a: EvidenceRecord, b: EvidenceRecord) {
  const byDate = publicationStamp(b.date) - publicationStamp(a.date);
  if (byDate) return byDate;
  return Number(a.pmid) - Number(b.pmid);
}

/** Guidelines, meta-analyses and reviews are interleaved. Date only orders inside each type. */
function mixTypes(articles: EvidenceRecord[]) {
  const buckets = new Map<number, EvidenceRecord[]>();
  for (const article of articles) {
    const rank = typeRank(article.type);
    buckets.set(rank, [...(buckets.get(rank) || []), article]);
  }
  for (const [rank, bucket] of buckets) buckets.set(rank, [...bucket].sort(byDateThenPmid));
  const ranks = [...buckets.keys()].sort((a, b) => a - b);
  const mixed: EvidenceRecord[] = [];
  let pending = true;
  while (pending) {
    pending = false;
    for (const rank of ranks) {
      const next = buckets.get(rank)?.shift();
      if (!next) continue;
      mixed.push(next);
      pending = true;
    }
  }
  return mixed;
}

/**
 * Drops off-topic, safety-only and combination papers when the question asks for indications.
 * If the topic filter would discard every PubMed hit, the original set is kept.
 */
export function selectForSynthesis(articles: EvidenceRecord[], mainConcept: SearchConcept, limit = 8, question = "") {
  const onTopic = mainConcept.length
    ? articles.filter((article) => mentionsConcept(article, mainConcept))
    : articles;
  let pool = onTopic.length ? onTopic : articles;
  if (question && indicationQuestion(question) && !/combinad|combination|seguran[cç]a|safety/i.test(question)) {
    pool = pool.filter((article) => !safetyOnly(article) && !combinationOnly(article));
    if (!pool.length) pool = onTopic.length ? onTopic : articles;
  }
  return mixTypes(pool).slice(0, limit);
}
