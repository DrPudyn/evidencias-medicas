import { HIGH_LEVEL_EVIDENCE_FILTER } from "../evidence-filter";

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

export function isMetforminPrediabetes(question: string) {
  const asked = fold(question);
  return /metformin/.test(asked) && /pre-?diabet|impaired glucose|tolerancia/.test(asked);
}

/** Heart-failure meta-analyses of the SGLT2 class, not combination or quadruple regimens. */
export function isolatedHeartFailureQuery(today: string) {
  const body = "(SGLT2 inhibitor*[tiab]) AND heart failure[ti] AND (meta-analysis[pt] OR systematic review[pt]) NOT (combination[tiab] OR quadruple[tiab])";
  return `${body} NOT (animals[mh] NOT humans[mh]) AND ${publicationDateClause(today)}`;
}

/** Metformin questions about diabetes search type 2 diabetes. Prediabetes questions do not. */
export function forceMetforminType2(concepts: SearchConcept[], question: string) {
  const asked = fold(question);
  if (!/metformin/.test(asked) || isMetforminPrediabetes(question)) return concepts;
  if (!/diabetes/.test(asked)) return concepts;
  let named = false;
  const next = concepts.map((concept) => concept.map((term) => {
    const folded = fold(term);
    if (/type 2 diabetes|\bt2dm\b|\bt2d\b/.test(folded)) {
      named = true;
      return term;
    }
    if (folded === "diabetes" || folded === "diabetes mellitus" || folded === "dm2" || folded === "diabetes tipo 2") {
      named = true;
      return "type 2 diabetes";
    }
    return term;
  }));
  if (!named) next.push(["type 2 diabetes"]);
  return next;
}

/** Meta-analyses and trials of metformin for preventing diabetes in prediabetes. */
export function metforminPrediabetesQuery(today: string) {
  const metformin = `("metformin"[Title/Abstract] OR "metformin"[MeSH Terms])`;
  const prediabetes = `("prediabetes"[Title/Abstract] OR "prediabetes"[MeSH Terms] OR "impaired glucose tolerance"[Title/Abstract] OR "impaired glucose tolerance"[MeSH Terms])`;
  const effect = `("diabetes incidence"[Title/Abstract] OR "progression"[Title/Abstract] OR "prevention"[Title/Abstract])`;
  const design = `("Meta-Analysis"[Publication Type] OR "Randomized Controlled Trial"[Publication Type])`;
  return `${metformin} AND ${prediabetes} AND ${effect} AND ${design} NOT (animals[mh] NOT humans[mh]) AND ${publicationDateClause(today)}`;
}

/** Adds the short forms a guideline or meta-analysis actually uses in the title. */
export function expandClassTerms(concept: SearchConcept) {
  const terms = [...concept];
  const joined = concept.join(" ").toLowerCase();
  if (/sglt|gliflozin|sodium[-\s]?glucose/.test(joined)) {
    for (const term of ["SGLT2 inhibitors", "sodium-glucose cotransporter", "sodium-glucose co-transporter", "gliflozin"]) {
      if (!terms.some((item) => item.toLowerCase() === term.toLowerCase())) terms.push(term);
    }
  }
  return terms;
}

export function evidenceQuery(concepts: SearchConcept[], today?: string) {
  const groups = concepts.map((concept) => {
    const synonyms = concept.map((term) => {
      const quoted = quoteTerm(term);
      return `(${quoted}[Title/Abstract] OR ${quoted}[MeSH Terms])`;
    });
    return `(${synonyms.join(" OR ")})`;
  });
  const typed = `${groups.join(" AND ")} AND ${HIGH_LEVEL_EVIDENCE_FILTER} NOT (animals[mh] NOT humans[mh])`;
  return today ? `${typed} AND ${publicationDateClause(today)}` : typed;
}

const CONTEXT_PHRASES = [
  "family practice", "family medicine", "general practice", "general practitioner",
  "primary care", "primary health care", "primary health", "ambulatory care",
  "outpatient", "community health", "community medicine", "care setting",
  "saude da familia", "atencao primaria", "pratica de saude", "healthcare", "medicina de familia",
];

/** Setting of care, not the drug or the disease. These are dropped before clinical concepts. */
export function isContextConcept(concept: SearchConcept) {
  return concept.length > 0 && concept.every((term) => {
    const folded = fold(term);
    return CONTEXT_PHRASES.some((phrase) => folded.includes(phrase));
  });
}

export function normalizeQuestion(question: string) {
  return fold(question).replace(/[^a-z0-9]+/g, " ").replace(/\s+/g, " ").trim();
}

const termCache = new Map<string, string>();

export type TermCacheDb = {
  prepare: (sql: string) => {
    bind: (...params: unknown[]) => {
      first: <T>() => Promise<T | null>;
      run: () => Promise<unknown>;
    };
  };
};

export function cachedSearchTerms(question: string) {
  return termCache.get(normalizeQuestion(question)) || "";
}

export async function readTermCache(question: string, db?: TermCacheDb | null) {
  const key = normalizeQuestion(question);
  if (db) {
    try {
      const row = await db.prepare("SELECT concepts FROM clinical_term_cache WHERE question_key = ?").bind(key).first<{ concepts: string }>();
      if (row?.concepts) {
        termCache.set(key, row.concepts);
        return row.concepts;
      }
    } catch {
      // The table may not exist yet. The memory cache still applies.
    }
  }
  return termCache.get(key) || "";
}

export function rememberSearchTerms(question: string, raw: string) {
  if (raw.trim()) termCache.set(normalizeQuestion(question), raw);
}

const RESULT_TTL_MS = 7 * 24 * 60 * 60 * 1000;
const resultCache = new Map<string, { pmids: string[]; at: number }>();

export function resultCacheKey(term: string, sort: string, retmax: number) {
  return `${sort}|${retmax}|${term}`;
}

export async function readResultCache(key: string, db?: TermCacheDb | null, now = Date.now()) {
  const memory = resultCache.get(key);
  if (memory && now - memory.at < RESULT_TTL_MS) return memory.pmids;
  if (memory) resultCache.delete(key);
  if (!db) return null;
  try {
    const row = await db.prepare("SELECT pmids, updated_at FROM clinical_result_cache WHERE query_key = ?").bind(key).first<{ pmids: string; updated_at: number }>();
    if (!row?.pmids || now - row.updated_at >= RESULT_TTL_MS) return null;
    const pmids = row.pmids.split(",").filter(Boolean);
    resultCache.set(key, { pmids, at: row.updated_at });
    return pmids;
  } catch {
    return null;
  }
}

export type FinalSetItem = { pmid: string; excerpt: string };

const finalSets = new Map<string, { items: FinalSetItem[]; at: number }>();

export function canonicalTerm(term: string) {
  const folded = fold(term).replace(/co-transporter/g, "cotransporter").replace(/co transporter/g, "cotransporter");
  if (/sglt-?2|gliflozin|sodium-glucose cotransporter|sodium glucose cotransporter|sodium-glucose transporter/.test(folded)) return "sglt2 inhibitors";
  if (folded === "metformin" || folded === "metformina") return "metformin";
  if (/glp-?1|glucagon-like peptide/.test(folded)) return "glp-1 receptor agonists";
  return folded;
}

/** Indication questions about a known class use one fixed term list, not the model's wording. */
export function knownClassTerms(question: string) {
  if (!isIndicationQuestion(question)) return null;
  const folded = fold(question);
  if (/isglt2|sglt-?2|gliflozin|cotransportador/.test(folded)) return ["sglt2 inhibitors", "SGLT2 inhibitors", "sodium-glucose cotransporter 2"];
  if (/metformina|\bmetformin\b/.test(folded)) return ["metformin"];
  if (/glp-?1|semaglutid|liraglutid|dulaglutid/.test(folded)) return ["GLP-1 receptor agonists"];
  return null;
}

export function finalSetKey(question: string, concepts: string[][]) {
  const fixed = knownClassTerms(question);
  const source = fixed ? [fixed] : concepts;
  const terms = source.map((concept) => concept.map((term) => canonicalTerm(term)).sort().join("|")).sort().join("||");
  return `final|${normalizeQuestion(question)}|${terms}`;
}

export async function readFinalSet(key: string, db?: TermCacheDb | null, now = Date.now()) {
  const memory = finalSets.get(key);
  if (memory && now - memory.at < RESULT_TTL_MS) return memory.items;
  if (memory) finalSets.delete(key);
  if (!db) return null;
  try {
    const row = await db.prepare("SELECT pmids, updated_at FROM clinical_result_cache WHERE query_key = ?").bind(key).first<{ pmids: string; updated_at: number }>();
    if (!row?.pmids || now - row.updated_at >= RESULT_TTL_MS) return null;
    const parsed = JSON.parse(row.pmids) as { items?: FinalSetItem[] };
    const items = Array.isArray(parsed?.items) ? parsed.items.filter((item) => item?.pmid && item?.excerpt) : [];
    if (!items.length) return null;
    finalSets.set(key, { items, at: row.updated_at });
    return items;
  } catch {
    return null;
  }
}

export type ApprovedCard = {
  sufficient: true;
  answer: string;
  references: Array<{ n: number; pmid: string; title: string; url: string; type?: string }>;
  discardedCitations: string[];
  disclaimer: string;
};

const approvedCards = new Map<string, { card: ApprovedCard; at: number }>();

export const CARD_PIPELINE = "13";

export function cardCacheKey(question: string) {
  return `card|${CARD_PIPELINE}|${normalizeQuestion(question)}`;
}

export async function readApprovedCard(question: string, db?: TermCacheDb | null, now = Date.now()) {
  const key = cardCacheKey(question);
  const memory = approvedCards.get(key);
  if (memory && now - memory.at < RESULT_TTL_MS) return memory.card;
  if (memory) approvedCards.delete(key);
  if (!db) return null;
  try {
    const row = await db.prepare("SELECT pmids, updated_at FROM clinical_result_cache WHERE query_key = ?").bind(key).first<{ pmids: string; updated_at: number }>();
    if (!row?.pmids || now - row.updated_at >= RESULT_TTL_MS) return null;
    const parsed = JSON.parse(row.pmids) as { card?: ApprovedCard };
    if (!parsed?.card?.sufficient || !parsed.card.answer) return null;
    approvedCards.set(key, { card: parsed.card, at: row.updated_at });
    return parsed.card;
  } catch {
    return null;
  }
}

export async function writeApprovedCard(question: string, card: ApprovedCard, db?: TermCacheDb | null, now = Date.now()) {
  if (!card.sufficient || !card.answer.trim()) return;
  const key = cardCacheKey(question);
  approvedCards.set(key, { card, at: now });
  if (!db) return;
  try {
    await db.prepare(
      "INSERT INTO clinical_result_cache (query_key, pmids, updated_at) VALUES (?, ?, ?) ON CONFLICT(query_key) DO UPDATE SET pmids = excluded.pmids, updated_at = excluded.updated_at",
    ).bind(key, JSON.stringify({ card }), now).run();
  } catch {
    // The table may not exist yet. The memory cache still applies.
  }
}

export async function writeFinalSet(key: string, items: FinalSetItem[], db?: TermCacheDb | null, now = Date.now()) {
  const unique = items.filter((item, index) => item.pmid && item.excerpt && items.findIndex((other) => other.pmid === item.pmid) === index);
  if (!unique.length) return;
  finalSets.set(key, { items: unique, at: now });
  if (!db) return;
  try {
    await db.prepare(
      "INSERT INTO clinical_result_cache (query_key, pmids, updated_at) VALUES (?, ?, ?) ON CONFLICT(query_key) DO UPDATE SET pmids = excluded.pmids, updated_at = excluded.updated_at",
    ).bind(key, JSON.stringify({ items: unique }), now).run();
  } catch {
    // The table may not exist yet. The memory cache still applies.
  }
}

export async function writeResultCache(key: string, pmids: string[], db?: TermCacheDb | null, now = Date.now()) {
  const unique = [...new Set(pmids.filter(Boolean))];
  resultCache.set(key, { pmids: unique, at: now });
  if (!db) return;
  try {
    await db.prepare(
      "INSERT INTO clinical_result_cache (query_key, pmids, updated_at) VALUES (?, ?, ?) ON CONFLICT(query_key) DO UPDATE SET pmids = excluded.pmids, updated_at = excluded.updated_at",
    ).bind(key, unique.join(","), now).run();
  } catch {
    // The table may not exist yet. The memory cache still applies.
  }
}

export async function writeTermCache(question: string, raw: string, db?: TermCacheDb | null) {
  if (!raw.trim()) return;
  const key = normalizeQuestion(question);
  termCache.set(key, raw);
  if (!db) return;
  try {
    await db.prepare(
      "INSERT INTO clinical_term_cache (question_key, concepts, updated_at) VALUES (?, ?, ?) ON CONFLICT(question_key) DO UPDATE SET concepts = excluded.concepts, updated_at = excluded.updated_at",
    ).bind(key, raw, Date.now()).run();
  } catch {
    // Memory already holds the value when D1 is unavailable.
  }
}

function mentionsPhrase(haystack: string, phrase: string) {
  const body = phrase.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return new RegExp(`(?:^|[^a-z0-9-])${body}(?:[^a-z0-9-]|$)`, "i").test(` ${haystack} `);
}

/**
 * Full query, then the same query without outcome or context concepts,
 * then the drug with each named condition, then the drug alone.
 * The outcome or context concept is removed before the search falls back to the drug by itself.
 */
export function searchAttempts(concepts: SearchConcept[], today: string, question = "") {
  const context = concepts.filter((concept) => isContextConcept(concept));
  const clinical = concepts.filter((concept) => !isContextConcept(concept));
  const core = clinical.length ? clinical : concepts;
  const anchor = core[0];
  const others = core.slice(1);
  const named = question ? others.filter((concept) => questionNamesConcept(question, concept)) : others;
  const extras = question ? others.filter((concept) => !questionNamesConcept(question, concept)) : [];
  const attempts: string[] = [];
  const push = (group: SearchConcept[], dated: boolean) => {
    const usable = group.filter((concept) => concept?.length);
    if (!usable.length) return;
    const term = dated ? evidenceQuery(usable, today) : evidenceQuery(usable);
    if (!attempts.includes(term)) attempts.push(term);
  };
  push([...core, ...context], true);
  if (extras.length) push([anchor, ...named, ...context], true);
  if (context.length) push([anchor, ...named], true);
  for (const condition of named) push([anchor, condition], true);
  push([anchor], true);
  push([anchor], false);
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

/** Disease aliases the model emits that do not contain the English phrase itself. */
const CONDITION_ALIASES: Array<{ id: string; search: string[]; pattern: RegExp; portuguese: RegExp }> = [
  {
    id: "ckd",
    search: ["chronic kidney disease", "diabetic kidney disease", "CKD"],
    pattern: /\b(?:ckd|dkd|chronic kidney disease|diabetic kidney(?: disease)?)\b/i,
    portuguese: /doenca renal|\bdrc\b|\bdkd\b/,
  },
  {
    id: "hf",
    search: ["heart failure", "heart failure with reduced ejection fraction", "HFrEF"],
    pattern: /\b(?:hfref|hfpef|heart failure(?: with (?:reduced|preserved) ejection fraction)?|reduced ejection fraction|preserved ejection fraction)\b/i,
    portuguese: /insuficiencia cardiaca|fracao de ejecao/,
  },
  {
    id: "prediabetes",
    search: ["prediabetic state", "prediabetes"],
    pattern: /\bpre-?diabet(?:ic|es)(?: state)?\b/i,
    portuguese: /pre-?diabetes/,
  },
  {
    id: "t2dm",
    search: ["type 2 diabetes"],
    pattern: /\b(?:t2dm|t2d|dm2|niddm|diabetics?|diabetes mellitus,? type 2|type 2 diabetes(?: mellitus)?|type ii diabetes)\b/i,
    portuguese: /diabetes tipo 2|\bdm2\b|\bt2dm\b/,
  },
  {
    id: "mash",
    search: ["metabolic dysfunction-associated steatohepatitis"],
    pattern: /\b(?:mash|nash|steatohepatitis)\b/i,
    portuguese: /esteato-?hepatite|\bmash\b/,
  },
];

const GUIDELINE_CONDITIONS = ["hf", "ckd", "t2dm", "mash"];

function aliasNamedInQuestion(question: string, alias: (typeof CONDITION_ALIASES)[number]) {
  const asked = fold(question);
  return alias.pattern.test(question) || alias.pattern.test(asked) || alias.portuguese.test(asked)
    || alias.search.some((term) => asked.includes(fold(term)));
}

export function isConditionTerm(term: string) {
  const folded = fold(term);
  if (CONDITION_ALIASES.some((alias) => alias.pattern.test(term) || alias.pattern.test(folded))) return true;
  return CONDITION_ENGLISH.some((english) => folded === english || folded.includes(english));
}

/** Removes a disease the question did not name, including DM2/T2DM glued to the drug concept. */
export function stripUnnamedConditions(term: string, question: string) {
  let text = term;
  for (const alias of CONDITION_ALIASES) {
    if (aliasNamedInQuestion(question, alias)) continue;
    text = text.replace(new RegExp(alias.pattern.source, "gi"), " ");
  }
  for (const english of CONDITION_ENGLISH) {
    if (questionNamesConcept(question, [english])) continue;
    text = text.replace(new RegExp(english.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "gi"), " ");
  }
  return text.replace(/\s+/g, " ").trim();
}

/** Marks that must appear in the title or abstract when the question names that condition. */
export function requiredConditionMarks(question: string) {
  const asked = fold(question);
  const marks: string[] = [];
  if (/pre-?diabet|pre diabetes/.test(asked)) {
    marks.push("prediabetes", "pre-diabetes", "pre diabetes", "prediabetic", "impaired glucose tolerance", "impaired fasting glucose");
  }
  else if (/(?:^|[^a-z0-9-])diabetes(?:[^a-z0-9-]|$)/.test(` ${asked} `)) marks.push("diabetes");
  if (/insuficiencia cardiaca/.test(asked)) marks.push("heart failure");
  if (/doenca renal|\bdrc\b/.test(asked)) marks.push("kidney");
  return marks;
}

export function conditionSearchTerms(label: string) {
  const alias = CONDITION_ALIASES.find((item) => item.search[0] === label || item.id === label);
  return alias ? alias.search : [label];
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
  if (CONDITION_ALIASES.some((alias) => (alias.pattern.test(concept.join(" ")) || concept.some((term) => alias.pattern.test(term))) && aliasNamedInQuestion(question, alias))) return true;
  if (concept.some((term) => mentionsPhrase(asked, fold(term)))) return true;
  for (const [source, target] of PT_EN) {
    if (!mentionsPhrase(asked, fold(source))) continue;
    const english = fold(target);
    const matches = concept.some((term) => {
      const folded = fold(term);
      return folded === english || folded.includes(english) || english.split(/\s+/).includes(folded);
    });
    if (matches) return true;
  }
  if (/sglt|sodium[-\s]?glucose/.test(concept.join(" ").toLowerCase()) && /sglt-?2|isglt2|gliflozin/.test(asked)) return true;
  return false;
}

export function conceptsForQuestion(concepts: SearchConcept[], question: string) {
  if (!question.trim()) return concepts;
  const stripped = concepts
    .map((concept) => {
      const terms: string[] = [];
      for (const term of concept) {
        const cleaned = stripUnnamedConditions(term, question);
        if (cleaned && !terms.includes(cleaned)) terms.push(cleaned);
      }
      return terms;
    })
    .filter((concept) => concept.length);
  const kept = stripped.filter((concept) => !isContextConcept(concept) && questionNamesConcept(question, concept));
  if (kept.length) return kept;
  const anchor = stripped.find((concept) => concept.some((term) => !isConditionTerm(term)));
  return anchor ? [anchor] : [];
}

/** Conditions named in a retrieved guideline, not conditions invented by the model. */
export function conditionsFromGuideline(record: { title: string; abstract: string }, question: string) {
  const text = `${record.title}\n${record.abstract || ""}`;
  const found: string[] = [];
  for (const alias of CONDITION_ALIASES) {
    if (!GUIDELINE_CONDITIONS.includes(alias.id)) continue;
    if (!alias.pattern.test(text)) continue;
    if (aliasNamedInQuestion(question, alias)) continue;
    found.push(alias.search[0]);
    if (found.length === 2) break;
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
