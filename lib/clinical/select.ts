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

function conceptNeedles(concept: SearchConcept) {
  const needles = new Set<string>();
  for (const synonym of concept) {
    const phrase = synonym.toLowerCase();
    if (phrase.length >= 4) needles.add(phrase);
    for (const token of distinctiveTokens(phrase)) needles.add(token);
  }
  if (/sglt-?2|gliflozin/.test(concept.join(" ").toLowerCase())) {
    needles.add("sglt2");
    needles.add("sglt-2");
    needles.add("gliflozin");
  }
  return [...needles];
}

export function mentionsConcept(article: Pick<EvidenceRecord, "title" | "abstract">, concept: SearchConcept) {
  const haystack = `${article.title} ${article.abstract}`.toLowerCase();
  return conceptNeedles(concept).some((needle) => haystack.includes(needle));
}

/** Guidelines first, then newer reviews, then the original relevance order. Off-topic papers are dropped. */
export function selectForSynthesis(articles: EvidenceRecord[], mainConcept: SearchConcept, limit = 8) {
  const onTopic = mainConcept.length
    ? articles.filter((article) => mentionsConcept(article, mainConcept))
    : articles;
  return onTopic
    .map((article, index) => ({ article, index }))
    .sort((a, b) => {
      const byType = typeRank(a.article.type) - typeRank(b.article.type);
      if (byType) return byType;
      const byDate = publicationStamp(b.article.date) - publicationStamp(a.article.date);
      if (byDate) return byDate;
      return a.index - b.index;
    })
    .slice(0, limit)
    .map((item) => item.article);
}
