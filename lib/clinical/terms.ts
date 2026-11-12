import { HIGH_LEVEL_EVIDENCE_FILTER } from "../evidence-filter";
import { conclusionText } from "../pubmed-xml";

const STOP = new Set([
  "para", "como", "qual", "quais", "sobre", "entre", "essa", "esse", "esta", "este", "uma", "com",
  "dos", "das", "que", "por", "mais", "menos", "existe", "existem", "devo", "usar", "uso", "paciente",
  "pacientes", "clinico", "clinica", "pergunta", "tratamento", "melhor", "conduta", "evidencia",
  "evidencias", "revisao", "diretriz", "estudo", "estudos", "quando", "onde", "porque",
  "adultos", "adulto", "criancas", "idade", "anos", "indicacoes", "indicacao",
  "use", "uses", "using", "indication", "indications", "healthcare", "health", "treatment", "treatments",
  "patient", "patients", "therapy", "therapies", "management", "study", "studies", "review", "reviews",
  "guideline", "guidelines", "systematic", "meta", "analysis", "outcome", "outcomes", "effect", "effects",
  "benefit", "benefits", "role", "adult", "adults", "clinical", "update", "based", "the", "and", "or",
  "for", "with", "in", "of", "on", "to", "from", "a", "an",
]);

const PT_EN: Array<[string, string]> = [
  ["insuficiência cardíaca", "heart failure"],
  ["insuficiencia cardiaca", "heart failure"],
  ["diabetes tipo 2", "type 2 diabetes"],
  ["diabetes tipo 1", "type 1 diabetes"],
  ["câncer de mama", "breast cancer"],
  ["cancer de mama", "breast cancer"],
  ["dor lombar", "low back pain"],
  ["hipertensão", "hypertension"],
  ["hipertensao", "hypertension"],
  ["metformina", "metformin"],
  ["empagliflozina", "empagliflozin"],
  ["dapagliflozina", "dapagliflozin"],
  ["semaglutida", "semaglutide"],
  ["atorvastatina", "atorvastatin"],
  ["losartana", "losartan"],
  ["amoxicilina", "amoxicillin"],
  ["ibuprofeno", "ibuprofen"],
  ["omeprazol", "omeprazole"],
  ["sertralina", "sertraline"],
  ["anticoagulação", "anticoagulation"],
  ["anticoagulacao", "anticoagulation"],
  ["gravidez", "pregnancy"],
  ["gestação", "pregnancy"],
  ["gestacao", "pregnancy"],
  ["obesidade", "obesity"],
  ["osteoporose", "osteoporosis"],
  ["tireoide", "thyroid"],
  ["depressão", "depression"],
  ["depressao", "depression"],
  ["ansiedade", "anxiety"],
  ["enxaqueca", "migraine"],
  ["pneumonia", "pneumonia"],
  ["sepse", "sepsis"],
  ["asma", "asthma"],
  ["diabetes", "diabetes"],
  ["estatina", "statin"],
  ["aspirina", "aspirin"],
  ["vacina", "vaccine"],
  ["antibiótico", "antibiotic"],
  ["antibiotico", "antibiotic"],
  ["covid", "COVID-19"],
  ["dpoc", "COPD"],
  ["câncer", "cancer"],
  ["cancer", "cancer"],
  ["inibidores de sglt2", "sglt2 inhibitors"],
  ["isglt2", "sglt2 inhibitors"],
  ["sglt2", "sglt2 inhibitors"],
  ["gliflozina", "gliflozin"],
  ["gliflozinas", "gliflozin"],
  ["saúde da família", "family practice"],
  ["saude da familia", "family practice"],
  ["atenção primária", "primary health care"],
  ["atencao primaria", "primary health care"],
];

export type SearchConcept = string[];

const MAX_CONCEPTS = 5;
const MAX_SYNONYMS = 4;

function fold(value: string) {
  return value.toLowerCase().normalize("NFD").replace(/\p{M}/gu, "");
}

function cleanSynonym(value: string) {
  const words = value
    .replace(/[\[\]"()]/g, " ")
    .replace(/\b(AND|NOT)\b/gi, " ")
    .split(/\s+/)
    .map((word) => word.replace(/^[^a-z0-9+-]+|[^a-z0-9+-]+$/gi, ""))
    .filter((word) => word && !STOP.has(fold(word)));
  const phrase = words.join(" ").trim().toLowerCase();
  if (phrase.length < 2 || phrase.length > 80) return "";
  if (!/^[\p{L}\p{N} .,'’+/-]+$/u.test(phrase)) return "";
  return phrase;
}

function conceptFrom(value: unknown): SearchConcept {
  const pieces = Array.isArray(value) ? value : [value];
  const synonyms: string[] = [];
  for (const piece of pieces) {
    if (typeof piece !== "string") continue;
    for (const alternative of piece.split(/\s+OR\s+/i)) {
      const cleaned = cleanSynonym(alternative);
      if (!cleaned || synonyms.includes(cleaned)) continue;
      synonyms.push(cleaned);
      if (synonyms.length === MAX_SYNONYMS) break;
    }
    if (synonyms.length === MAX_SYNONYMS) break;
  }
  return synonyms;
}

export function sanitizeConcepts(raw: unknown): SearchConcept[] {
  const record = raw && typeof raw === "object" ? raw as Record<string, unknown> : {};
  const source = Array.isArray(raw)
    ? raw
    : Array.isArray(record.concepts)
      ? record.concepts
      : Array.isArray(record.terms)
        ? record.terms
        : [];
  const concepts: SearchConcept[] = [];
  for (const item of source) {
    const concept = conceptFrom(item);
    if (!concept.length) continue;
    const key = concept.join("|");
    if (concepts.some((current) => current.join("|") === key)) continue;
    concepts.push(concept);
    if (concepts.length === MAX_CONCEPTS) break;
  }
  return concepts;
}

export function fallbackSearchTerms(question: string): string[] {
  const folded = fold(question);
  const pairs = [...PT_EN].sort((a, b) => fold(b[0]).length - fold(a[0]).length);
  let rest = ` ${folded} `;
  const found: string[] = [];
  for (const [source, target] of pairs) {
    const key = fold(source);
    if (rest.includes(key)) {
      found.push(target.toLowerCase());
      rest = rest.replaceAll(key, " ");
    }
  }
  if (!found.length) {
    for (const word of rest.split(/[^a-z0-9+-]+/).filter((item) => item.length >= 5 && !STOP.has(item))) {
      if (found.length >= 6) break;
      found.push(word);
    }
  }
  return [...new Set(found)].slice(0, MAX_CONCEPTS);
}

function quoteTerm(term: string) {
  return `"${term.replace(/"/g, "")}"`;
}

export function publicationDateClause(today: string) {
  return `("1900/01/01"[Date - Publication] : "${today}"[Date - Publication])`;
}

export function evidenceQuery(concepts: SearchConcept[], today?: string) {
  const groups = concepts.map((concept) => {
    const synonyms = concept.map((term) => {
      const quoted = quoteTerm(term);
      return `(${quoted}[Title/Abstract] OR ${quoted}[MeSH Terms])`;
    });
    return `(${synonyms.join(" OR ")})`;
  });
  const typed = `${groups.join(" AND ")} AND ${HIGH_LEVEL_EVIDENCE_FILTER}`;
  return today ? `${typed} AND ${publicationDateClause(today)}` : typed;
}

const CONTEXT_PHRASES = [
  "family practice", "family medicine", "general practice", "general practitioner",
  "primary care", "primary health care", "primary health", "ambulatory care",
  "outpatient", "community health", "community medicine", "care setting",
];

/** Setting of care, not the drug or the disease. These are dropped before clinical concepts. */
export function isContextConcept(concept: SearchConcept) {
  return concept.length > 0 && concept.every((term) => CONTEXT_PHRASES.some((phrase) => term.includes(phrase)));
}

function pairsOf(concepts: SearchConcept[]) {
  const pairs: SearchConcept[][] = [];
  for (let left = 0; left < concepts.length; left += 1) {
    for (let right = left + 1; right < concepts.length; right += 1) {
      pairs.push([concepts[left], concepts[right]]);
    }
  }
  return pairs;
}

/**
 * Full query, then the same query without context concepts, then clinical pairs,
 * then single clinical concepts, and a last try of the main concept without the date window.
 */
export function searchAttempts(concepts: SearchConcept[], today: string) {
  const clinical = concepts.filter((concept) => !isContextConcept(concept));
  const context = concepts.filter((concept) => isContextConcept(concept));
  const core = clinical.length ? clinical : concepts;
  const attempts: string[] = [];
  const push = (group: SearchConcept[], dated: boolean) => {
    if (!group.length) return;
    const term = dated ? evidenceQuery(group, today) : evidenceQuery(group);
    if (!attempts.includes(term)) attempts.push(term);
  };
  push([...core, ...context], true);
  if (context.length) push(core, true);
  for (const pair of pairsOf(core)) push(pair, true);
  for (const concept of core) push([concept], true);
  push([core[0]], false);
  return attempts;
}

const NOT_A_CONDITION = new Set([
  "metformin", "empagliflozin", "dapagliflozin", "semaglutide", "atorvastatin", "losartan",
  "amoxicillin", "ibuprofen", "omeprazole", "sertraline", "anticoagulation", "statin", "aspirin",
  "vaccine", "antibiotic", "sglt2 inhibitors", "gliflozin", "family practice", "primary health care",
]);

const CONDITION_ENGLISH = PT_EN
  .map(([, english]) => fold(english))
  .filter((english) => !NOT_A_CONDITION.has(english))
  .sort((left, right) => right.length - left.length);

export function isIndicationQuestion(question: string) {
  return /indica/.test(fold(question));
}

export function isConditionTerm(term: string) {
  const folded = fold(term);
  return CONDITION_ENGLISH.some((english) => folded === english || folded.includes(english));
}

/**
 * A condition counts only when the question names it, in Portuguese or English.
 * Indication questions that name no disease therefore search the class alone.
 */
export function questionNamesConcept(question: string, concept: SearchConcept) {
  const asked = fold(question);
  if (isContextConcept(concept)) {
    const family = /saude da familia|family practice|family medicine|medicina da familia/.test(asked);
    const primary = /atencao primaria|primary care|primary health/.test(asked);
    const term = concept.join(" ");
    if (family && /family practice|family medicine|general practice/.test(term)) return true;
    if (primary && /primary/.test(term)) return true;
    return false;
  }
  if (concept.some((term) => asked.includes(fold(term)))) return true;
  for (const [source, target] of PT_EN) {
    if (!asked.includes(fold(source))) continue;
    const english = fold(target);
    const matches = concept.some((term) => {
      const folded = fold(term);
      return folded === english || folded.includes(english) || english.split(/\s+/).includes(folded);
    });
    if (matches) return true;
  }
  if (/sglt/.test(concept.join(" ").toLowerCase()) && /sglt-?2|isglt2|gliflozin/.test(asked)) return true;
  return false;
}

export function conceptsForQuestion(concepts: SearchConcept[], question: string) {
  if (!question.trim()) return concepts;
  const stripped = concepts
    .map((concept) => concept.filter((term) => !isConditionTerm(term) || questionNamesConcept(question, [term])))
    .filter((concept) => concept.length);
  const kept = stripped.filter((concept) => questionNamesConcept(question, concept));
  if (kept.length) return kept;
  const anchor = stripped.find((concept) => concept.some((term) => !isConditionTerm(term)));
  return anchor ? [anchor] : [];
}

/** Conditions named in a retrieved guideline, not conditions invented by the model. */
export function conditionsFromGuideline(record: { title: string; abstract: string }, question: string) {
  const text = fold(`${record.title} ${conclusionText(record.abstract || "")}`);
  const asked = fold(question);
  const found: string[] = [];
  const pairs = PT_EN
    .filter(([, english]) => !NOT_A_CONDITION.has(fold(english)))
    .sort((left, right) => fold(right[1]).length - fold(left[1]).length);
  for (const [source, target] of pairs) {
    const english = fold(target);
    const portuguese = fold(source);
    if (!text.includes(english) && !text.includes(portuguese)) continue;
    if (asked.includes(portuguese) || asked.includes(english)) continue;
    if (found.some((item) => item.includes(english) || english.includes(item))) continue;
    found.push(target.toLowerCase());
    if (found.length === 3) break;
  }
  return found;
}

export function queryForKind(term: string, kind: "high-level" | "guideline" | "meta" = "high-level") {
  if (kind === "high-level") return term;
  const filter = kind === "guideline"
    ? '("Practice Guideline"[Publication Type] OR "Guideline"[Publication Type])'
    : '"Meta-Analysis"[Publication Type]';
  return term.includes(HIGH_LEVEL_EVIDENCE_FILTER)
    ? term.replace(HIGH_LEVEL_EVIDENCE_FILTER, filter)
    : `${term} AND ${filter}`;
}

/** Drug or class plus each other named clinical condition, then the anchor alone. */
export function pairQueries(concepts: SearchConcept[], today: string) {
  const clinical = concepts.filter((concept) => !isContextConcept(concept));
  if (clinical.length < 2) return [];
  const [anchor, ...conditions] = clinical;
  const queries = conditions.map((condition) => evidenceQuery([anchor, condition], today));
  queries.push(evidenceQuery([anchor], today));
  return [...new Set(queries)];
}

export function saoPauloPublicationDay(now = new Date()) {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "America/Sao_Paulo" }).format(now).replaceAll("-", "/");
}

export function parseJsonObject(raw: string): Record<string, unknown> | null {
  const trimmed = raw.trim().replace(/^```(?:json)?/i, "").replace(/```$/i, "").trim();
  const start = trimmed.indexOf("{");
  const end = trimmed.lastIndexOf("}");
  if (start < 0 || end <= start) return null;
  try {
    const value = JSON.parse(trimmed.slice(start, end + 1)) as unknown;
    return value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : null;
  } catch {
    return null;
  }
}
