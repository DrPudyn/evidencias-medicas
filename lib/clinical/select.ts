import { conclusionText } from "../pubmed-xml";
import type { EvidenceRecord } from "./types";
import { requiredConditionMarks, type SearchConcept } from "./terms";

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
  if (/sodium[-\s]?glucose(?:\s+co-?)?\s*(?:transporters?|cotransporters?|cotransport)/.test(folded)
    || /sglt-?2i?\b|gliflozins?/.test(folded)
    || /empagliflozin|dapagliflozin|canagliflozin|ertugliflozin|sotagliflozin|bexagliflozin/.test(folded)) {
    aliases.push("sglt2", "sglt-2", "sglt2i", "gliflozin", "sodium glucose cotransporter", "sodium glucose cotransport");
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

/** The class has to be the subject: title or conclusion, not a passing mention. */
export function isVeterinary(title: string) {
  return /\b(cats?|dogs?|felines?|canines?|veterinary|kittens?|puppies|equine|bovine|rodents?|rats?|mice|mouse|murine|preclinical|experimental|animal models?)\b/i.test(title);
}

const SOCIETY = /\b(ADA|KDIGO|ESC|EASD|AHA|ACC|SBD|SBC|CCS|CHFS|KDOQI|NICE|AACE|USPSTF)\b|American Diabetes Association|Canadian Cardiovascular Society|European Society of Cardiology|Kidney Disease: Improving Global Outcomes|Sociedade Brasileira de Diabetes|Sociedade Brasileira de Cardiologia|Endocrine Society/i;

export function isSocietyGuideline(title: string) {
  return SOCIETY.test(title);
}

function textHasConcept(text: string, concept: SearchConcept) {
  const needles = conceptNeedles(concept);
  const folded = text.toLowerCase();
  if (needles.some((needle) => folded.includes(needle))) return true;
  const aliases = classAliases(text);
  return aliases.some((alias) => needles.some((needle) => alias.includes(needle) || needle.includes(alias)));
}

function labeledConclusion(abstract: string) {
  return abstract.split(/\n+/).filter((line) => /^(conclusions?|interpretation|summary|conclus)/i.test(line.trim())).join(" ");
}

function isGuideline(article: Pick<EvidenceRecord, "type">) {
  const value = (article.type || "").toLowerCase();
  return value.includes("diretriz") || value.includes("guideline");
}

export function conceptInFocus(article: Pick<EvidenceRecord, "title" | "abstract" | "type">, concept: SearchConcept, question = "") {
  if (!conceptNeedles(concept).length) return false;
  if (requiredConditionMarks(question).length) return textHasConcept(`${article.title} ${article.abstract}`, concept);
  if (textHasConcept(article.title, concept)) return true;
  if (isGuideline(article)) return textHasConcept(labeledConclusion(article.abstract || ""), concept);
  return textHasConcept(conclusionText(article.abstract || ""), concept);
}

function matchesAskedCondition(article: Pick<EvidenceRecord, "title" | "abstract">, question: string) {
  const marks = requiredConditionMarks(question);
  if (!marks.length) return true;
  const haystack = `${article.title} ${article.abstract}`.toLowerCase().normalize("NFD").replace(/\p{M}/gu, "");
  return marks.some((mark) => haystack.includes(mark));
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

function notAnIndication(article: EvidenceRecord) {
  return /sarcopenia|muscle mass|massa muscular|skeletal muscle/i.test(article.title);
}

/** Umbrella reviews and exercise-versus-metformin network meta-analyses lead prediabetes questions. */
export function prediabetesPriority(article: EvidenceRecord, question: string) {
  const asked = foldText(question);
  if (!/pre-?diabet|impaired glucose|impaired fasting/.test(asked)) return 2;
  const title = foldText(article.title);
  const body = foldText(`${article.title} ${article.abstract}`);
  if (/umbrella/.test(title)) return 0;
  if (/network meta/.test(body) && /exercise/.test(body) && /metformin/.test(body)) return 1;
  return 2;
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
 * Drops papers that mention the class only in passing.
 * If no article matches the concept at all, the PubMed set is kept.
 */
export function selectForSynthesis(articles: EvidenceRecord[], mainConcept: SearchConcept, limit = 8, question = "") {
  const humans = articles.filter((article) => !isVeterinary(article.title));
  const focused = mainConcept.length ? humans.filter((article) => conceptInFocus(article, mainConcept, question)) : humans;
  const passing = mainConcept.length ? humans.filter((article) => mentionsConcept(article, mainConcept)) : humans;
  let pool = focused.length ? focused : (passing.length ? [] : humans);
  pool = pool.filter((article) => matchesAskedCondition(article, question));
  if (question && indicationQuestion(question) && !/combinad|combination|seguran[cç]a|safety/i.test(question)) {
    const narrowed = pool.filter((article) => !safetyOnly(article) && !combinationOnly(article));
    if (narrowed.length || !pool.length) pool = narrowed;
  }
  return mixTypes(pool)
    .sort((a, b) => prediabetesPriority(a, question) - prediabetesPriority(b, question))
    .slice(0, limit);
}

/**
 * Guidelines in relevance order, then large meta-analyses, then recent papers.
 * The first guideline is kept when one survived the topic filter.
 */
export function mergeIndicationRecords(input: {
  guidelines: EvidenceRecord[];
  metas: EvidenceRecord[];
  recent: EvidenceRecord[];
  supplemental: EvidenceRecord[];
  outcomes?: EvidenceRecord[];
  cautions?: EvidenceRecord[];
  concept: SearchConcept;
  question: string;
  limit?: number;
}) {
  const limit = input.limit ?? 6;
  const keep = (list: EvidenceRecord[], precaution = false) => {
    const out: EvidenceRecord[] = [];
    const seen = new Set<string>();
    for (const article of list) {
      if (seen.has(article.pmid) || isVeterinary(article.title) || !matchesAskedCondition(article, input.question)) continue;
      const onTopic = !input.concept.length || conceptInFocus(article, input.concept, input.question);
      if (!onTopic) continue;
      if (!precaution && notAnIndication(article)) continue;
      if (!precaution && input.question && indicationQuestion(input.question) && !/combinad|combination|seguran[cç]a|safety/i.test(input.question)) {
        if (safetyOnly(article) || combinationOnly(article)) continue;
      }
      seen.add(article.pmid);
      out.push(article);
    }
    return out;
  };
  const diverted = [...input.metas, ...input.recent, ...input.supplemental, ...(input.outcomes || [])].filter(notAnIndication);
  const guides = keep(input.guidelines)
    .map((article, index) => ({ article, index, society: isSocietyGuideline(article.title) ? 0 : 1 }))
    .sort((a, b) => a.society - b.society || a.index - b.index)
    .map((item) => item.article);
  const metas = keep(input.metas);
  const extra = keep(input.supplemental);
  const recent = keep(input.recent);
  const outcomes = keep(input.outcomes || []);
  const cautions = keep([...(input.cautions || []), ...diverted], true);
  const picked: EvidenceRecord[] = [];
  const used = new Set<string>();
  const take = (article?: EvidenceRecord) => {
    if (!article || used.has(article.pmid) || picked.length >= limit) return;
    used.add(article.pmid);
    picked.push(article);
  };
  take(guides[0]);
  take(outcomes[0]);
  take(outcomes[1]);
  take(cautions[0]);
  take(metas[0]);
  const lanes = [guides.slice(1), outcomes.slice(2), metas.slice(1), extra, recent];
  let pending = true;
  while (pending && picked.length < limit) {
    pending = false;
    for (const lane of lanes) {
      while (lane.length && used.has(lane[0].pmid)) lane.shift();
      const next = lane.shift();
      if (!next) continue;
      pending = true;
      take(next);
      if (picked.length >= limit) break;
    }
  }
  return picked.sort((a, b) => prediabetesPriority(a, input.question) - prediabetesPriority(b, input.question));
}
