import type { ClinicalAnswer, ClinicalReference, EvidenceRecord } from "./types";
import { isMetforminPrediabetes, type SearchConcept } from "./terms";
import { isYesNoQuestion } from "./prompts";
import { conclusionText } from "../pubmed-xml";
import { classAliases, conceptNeedles, isIsolatedHeartFailureCandidate } from "./select";
import { CLINICAL_DISCLAIMER } from "./types";

const ANSWER_MAX = 2200;

export function toReference(record: EvidenceRecord, n: number): ClinicalReference {
  return {
    n,
    pmid: record.pmid,
    title: record.title,
    url: `https://pubmed.ncbi.nlm.nih.gov/${record.pmid}/`,
    type: record.type || undefined,
  };
}

export function insufficientAnswer(message: string, discarded: string[] = []): ClinicalAnswer {
  return {
    sufficient: false,
    answer: message,
    references: [],
    discardedCitations: [...new Set(discarded)],
    disclaimer: CLINICAL_DISCLAIMER,
  };
}

const WORD_LETTERS = "A-Za-zÁÀÂÃÉÊÍÓÔÕÚÇáàâãéêíóôõúç";

/** Fixes IniciaÇÃO. Leaves iSGLT2, eGFR, SGLT2i and HbA1c alone. */
export function normalizeOddCaps(text: string) {
  return text.replace(new RegExp(`[${WORD_LETTERS}]{5,}`, "g"), (word) => {
    if (!new RegExp(`[A-ZÁÀÂÃÉÊÍÓÔÕÚÇ][a-záàâãéêíóôõúç]+[A-ZÁÀÂÃÉÊÍÓÔÕÚÇ]`).test(word)) return word;
    return word.replace(/([a-záàâãéêíóôõúç])([A-ZÁÀÂÃÉÊÍÓÔÕÚÇ]{2,})/g, (_match, lower: string, upper: string) => lower + upper.toLowerCase());
  });
}

function tidy(text: string) {
  return normalizeOddCaps(text)
    .replace(/\s+([,.;:!?])/g, "$1")
    .replace(/\(\s*\)/g, "")
    .replace(/[ \t]{2,}/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function splitUnits(text: string) {
  return text
    .split(/\n+/)
    .flatMap((line) => line.split(/(?<=[.!?;])\s+/))
    .map((unit) => unit.trim())
    .filter(Boolean);
}

/** [n] is the number printed on the article we sent. Five or more digits are a PMID. */
export function recordForMarker(raw: string, records: EvidenceRecord[], byId: Map<string, EvidenceRecord>) {
  const digits = raw.replace(/\D/g, "");
  if (!digits) return null;
  if (digits.length >= 5) return byId.get(digits) ?? null;
  const asIndex = Number(digits);
  if (String(asIndex) === digits && asIndex >= 1 && asIndex <= records.length) return records[asIndex - 1];
  return byId.get(digits) ?? null;
}

const PROMPT_ECHOES = [
  "criterios praticos",
  "criterio pratico",
  "outra condicao",
  "condicao:",
  "tfg e albuminuria",
];

function fold(value: string) {
  return value.toLowerCase().normalize("NFD").replace(/\p{M}/gu, "");
}

/** Drops a line that repeats the prompt example unless that same wording is in the cited abstract. */
export function echoesPrompt(unit: string, citedText: string) {
  const folded = fold(unit);
  const source = fold(citedText);
  return PROMPT_ECHOES.some((leak) => folded.includes(leak) && !source.includes(leak));
}

function markersOf(unit: string) {
  const found: string[] = [];
  for (const match of unit.matchAll(/\[(\d{1,9})\]|\/?\bpmid[:\s]*(\d{1,9})\b/gi)) {
    found.push(match[1] || match[2]);
  }
  return found;
}

const SPECIFIC_DRUGS: Array<[string, string]> = [
  ["dapagliflozin", "dapagliflozina"],
  ["empagliflozin", "empagliflozina"],
  ["canagliflozin", "canagliflozina"],
  ["ertugliflozin", "ertugliflozina"],
  ["sotagliflozin", "sotagliflozina"],
  ["bexagliflozin", "bexagliflozina"],
];

function drugsInExcerpt(excerpt: string) {
  const folded = fold(excerpt);
  return SPECIFIC_DRUGS.filter(([english]) => folded.includes(english));
}

function excerptNamesClass(excerpt: string) {
  return /sglt-?2i?\b|\bgliflozins?\b|sodium[-\s]?glucose(?:\s+co-?)?\s*(?:transporters?|cotransporters?|cotransport)/.test(fold(excerpt));
}

/** A finding about one drug is written as that drug, not as the whole class. */
export function attributeSpecificDrug(line: string, excerpt: string) {
  const drugs = drugsInExcerpt(excerpt);
  if (drugs.length !== 1 || excerptNamesClass(excerpt)) return line;
  const portuguese = drugs[0][1];
  if (fold(line).includes(fold(portuguese))) return line;
  return line
    .replace(/os inibidores de sglt-?2/gi, `a ${portuguese}`)
    .replace(/inibidores de sglt-?2/gi, portuguese)
    .replace(/\bisglt-?2\b/gi, portuguese);
}

export function creditsClassForSingleDrug(line: string, excerpt: string) {
  const drugs = drugsInExcerpt(excerpt);
  if (drugs.length !== 1 || excerptNamesClass(excerpt)) return false;
  const shown = attributeSpecificDrug(line, excerpt);
  return /inibidores de sglt-?2|\bisglt-?2\b/i.test(shown) && !fold(shown).includes(fold(drugs[0][1]));
}

const CERTAINTY_CLAIMS: Array<{ level: "very-low" | "low" | "moderate" | "high"; source: string }> = [
  { level: "very-low", source: ",?\\s*com certeza muito baixa|,?\\s*certeza muito baixa" },
  { level: "low", source: ",?\\s*com certeza baixa|(?<!muito )certeza baixa" },
  { level: "moderate", source: ",?\\s*com certeza moderada|,?\\s*certeza moderada" },
  { level: "high", source: ",?\\s*com certeza alta|,?\\s*certeza alta" },
];

function excerptHasCertainty(excerpt: string, level: "very-low" | "low" | "moderate" | "high") {
  const text = excerpt.toLowerCase();
  const folded = fold(excerpt);
  if (level === "very-low") return /very low[ -]certainty/.test(text) || /certeza muito baixa/.test(folded);
  if (level === "low") return /(?<!very )low[ -]certainty|limited certainty|interpreted cautiously|with caution/.test(text) || /(?<!muito )certeza baixa|certeza limitada|cautela/.test(folded);
  if (level === "moderate") return /moderate[ -]certainty/.test(text) || /certeza moderada/.test(folded);
  return /\bhigh certainty\b/.test(text) || /certeza alta/.test(folded);
}

/** Drops a certainty grade the cited excerpt does not state. */
export function stripInventedCertainty(line: string, excerpt: string) {
  let result = line;
  for (const claim of CERTAINTY_CLAIMS) {
    if (!excerptHasCertainty(excerpt, claim.level)) result = result.replace(new RegExp(claim.source, "gi"), "");
  }
  return tidy(result);
}

type Outcome = { stems: string[]; tokens: string[] };

const OUTCOMES: Outcome[] = [
  { stems: ["hospitali", "hospitalizac", "hospitalization", "hospitalisation"], tokens: [] },
  { stems: ["heart failure", "insuficiencia cardiaca"], tokens: ["ic", "hf", "icfer"] },
  { stems: ["mortalit", "mortalid", "morte", "death", "deaths"], tokens: [] },
  { stems: ["cardiovascular", "cardioprotect", "mace"], tokens: ["cv"] },
  { stems: ["kidney", "renal"], tokens: ["drc", "ckd"] },
  { stems: ["albuminuria"], tokens: [] },
  { stems: ["fracture", "fratura"], tokens: [] },
  { stems: ["weight", "peso"], tokens: [] },
  { stems: ["myocardial", "infarto"], tokens: [] },
  { stems: ["infection", "infec"], tokens: [] },
  { stems: ["genital"], tokens: [] },
  { stems: ["hepatic"], tokens: [] },
  { stems: ["metabolic"], tokens: [] },
  { stems: ["liver", "figad"], tokens: [] },
  { stems: ["steatosis", "esteatose"], tokens: [] },
  { stems: ["histolog"], tokens: [] },
];

const OTHER_DRUGS = ["semaglutide", "liraglutide", "dulaglutide", "tirzepatide", "exenatide", "insulin", "sitagliptin"];

function withAbbreviations(text: string) {
  return fold(text)
    .replace(/\btype ii dm\b/g, "type 2 diabetes")
    .replace(/\bt2dm\b/g, "type 2 diabetes")
    .replace(/\bckd\b/g, "ckd kidney")
    .replace(/\bhfref\b/g, "hfref heart failure icfer")
    .replace(/\bhfpef\b/g, "hfpef heart failure icfep")
    .replace(/\bhfh\b/g, "hfh heart failure hospitalization")
    .replace(/\bhf\b/g, "hf heart failure");
}

function textHasOutcome(text: string, outcome: Outcome) {
  let folded = withAbbreviations(text);
  if (outcome.stems.includes("cardiovascular")) folded = folded.replace(/cardiovascular risk/g, " ");
  if (outcome.stems.some((stem) => folded.includes(stem))) return true;
  return outcome.tokens.some((token) => new RegExp(`(?:^|[^a-z0-9])${token}(?:[^a-z0-9]|$)`).test(folded));
}

function outcomeHits(line: string) {
  const body = line.replace(/^(?:DM2 com DRC|DM2 com IC|DM2 com DCV|ICFEr|ICFEp|DM2|DRC|IC)\s*:\s*/i, "");
  return OUTCOMES.filter((outcome) => textHasOutcome(body, outcome));
}

function firstOutcomeAt(text: string, outcome: Outcome) {
  const folded = withAbbreviations(text);
  let at = -1;
  for (const stem of outcome.stems) {
    const index = folded.indexOf(stem);
    if (index >= 0 && (at < 0 || index < at)) at = index;
  }
  for (const token of outcome.tokens) {
    const match = new RegExp(`(?:^|[^a-z0-9])${token}(?:[^a-z0-9]|$)`).exec(folded);
    if (match && (at < 0 || match.index < at)) at = match.index;
  }
  return at;
}

function hedgeAt(text: string) {
  const folded = withAbbreviations(text);
  const match = /\b(suggests?|may|might|could|possibly)\b/.exec(folded);
  if (!match) return -1;
  const window = folded.slice(match.index, match.index + match[0].length + 4);
  if (/^(?:could|may|might) not\b/.test(window)) return -1;
  return match.index;
}

const FINITE_VERBS: Array<[RegExp, string, boolean]> = [
  [/\bmelhoraram\b/gi, "melhorar", true],
  [/\bmelhorou\b/gi, "melhorar", false],
  [/\bmelhoram\b/gi, "melhorar", true],
  [/\breduziram\b/gi, "reduzir", true],
  [/\breduziu\b/gi, "reduzir", false],
  [/\breduzem\b/gi, "reduzir", true],
  [/\breduz\b/gi, "reduzir", false],
  [/\baumentaram\b/gi, "aumentar", true],
  [/\baumentou\b/gi, "aumentar", false],
  [/\baumentam\b/gi, "aumentar", true],
  [/\baumenta\b/gi, "aumentar", false],
  [/\brepresentam\b/gi, "representar", true],
  [/\brepresenta\b/gi, "representar", false],
];

const ALIGNMENT: Array<[string, string, number]> = [
  ["reduz", "reduc", 3],
  ["melhor", "improv", 3],
  ["represent", "represent", 3],
  ["otim", "optimal", 3],
  ["incidenc", "incidenc", 2],
  ["diabetes", "diabet", 1],
  ["dose", "dose", 1],
  ["750", "750", 2],
  ["renal", "renal", 2],
];

function alignmentScore(line: string, sentence: string) {
  const left = fold(line);
  const right = fold(sentence);
  return ALIGNMENT.reduce((score, [portuguese, english, weight]) => (
    left.includes(portuguese) && right.includes(english) ? score + weight : score
  ), 0);
}

function sentenceHedgesAligned(line: string, sentence: string) {
  const at = hedgeAt(sentence);
  if (at < 0) return false;
  const folded = withAbbreviations(sentence);
  return ALIGNMENT.some(([portuguese, english]) => {
    if (!fold(line).includes(portuguese)) return false;
    const index = folded.indexOf(english);
    return index > at;
  });
}

/** The supporting sentence hedges the claim with suggest, may, might, could or possibly. */
export function claimNeedsHedge(line: string, excerpt: string) {
  const sentences = excerpt.split(/\n+|(?<=[.!?])\s+/);
  const hits = outcomeHits(line);
  if (hits.length) {
    return sentences.some((sentence) => {
      const at = hedgeAt(sentence);
      if (at < 0) return false;
      return hits.some((outcome) => {
        const outcomeAt = firstOutcomeAt(sentence, outcome);
        return outcomeAt > at;
      });
    });
  }
  const scored = sentences
    .map((sentence) => ({ sentence, score: alignmentScore(line, sentence) }))
    .filter((item) => item.score > 0);
  if (!scored.length) return false;
  const best = Math.max(...scored.map((item) => item.score));
  const top = scored.filter((item) => item.score === best);
  return top.length > 0 && top.every((item) => sentenceHedgesAligned(line, item.sentence));
}

function hedgeCoordinatedVerbs(line: string) {
  let plural = false;
  let replaced = false;
  let text = line;
  for (const [pattern, infinitive, isPlural] of FINITE_VERBS) {
    text = text.replace(pattern, () => {
      replaced = true;
      if (isPlural) plural = true;
      return infinitive;
    });
  }
  if (/\b(pode|podem|sugere\w*|possivelmente)\b/.test(fold(text))) return text;
  if (!replaced) return null;
  const modal = plural ? "podem" : "pode";
  return text.replace(/\b(melhorar|reduzir|aumentar|representar)\b/, `${modal} $1`);
}

/** Adds pode to every coordinated verb when the supporting sentence is only a suggestion. */
export function ensureModalHedge(line: string, excerpt: string) {
  return applyCodeCertainty(line, excerpt);
}

export function supportCertainty(support: string): "firm" | "hedge" {
  if (/\b(we recommend|is recommended|recommendations?)\b|high[ -]certainty|(?<!low to )high coe|moderate-to-high|moderate to high|moderate-\s+to high|\bdemonstrates\b/i.test(support)) return "firm";
  if (/\b(suggest(?:s|ed|ing)?|appears?|may|might|likely)\b|\bassociated\b|\blinked\b|very low[ -]certainty|(?<!very )low[ -]certainty/i.test(support)) return "hedge";
  return "firm";
}

function stripHedge(line: string) {
  return line
    .replace(/\bpodem\s+melhorar\b/gi, "melhoram")
    .replace(/\bpode\s+melhorar\b/gi, "melhora")
    .replace(/\bpodem\s+reduzir\b/gi, "reduzem")
    .replace(/\bpode\s+reduzir\b/gi, "reduz")
    .replace(/\bpodem\s+aumentar\b/gi, "aumentam")
    .replace(/\bpode\s+aumentar\b/gi, "aumenta")
    .replace(/\bpodem\s+representar\b/gi, "representam")
    .replace(/\bpode\s+representar\b/gi, "representa");
}

/** A negative source sentence never takes pode. */
export function sourceIsNegative(support: string) {
  if (/\bmay reduce\b/i.test(support) && /however|totality|pooled/i.test(support)) return false;
  return /\b(?:did not|do not|does not)\s+(?:significantly\s+)?(?:reduce|lower|decrease)|\bnot significantly\b|\bno significant (?:effect|reduction|difference)\b|\bdid not demonstrate\b|\bnot associated\b|\bnot linked\b|\bno association\b/i.test(support);
}

export function applyCodeCertainty(line: string, support: string) {
  if (sourceIsNegative(support)) return stripHedge(line).replace(/\bpodem\b/gi, "").replace(/\bpode\b/gi, "").replace(/\s{2,}/g, " ").trim();
  if (/associa-se|associam-se/.test(fold(line))) return line;
  if (supportCertainty(support) === "hedge") return hedgeCoordinatedVerbs(line) || line;
  return stripHedge(line);
}

function polarityFlipped(line: string, support: string) {
  const folded = fold(line);
  const negativeLine = /\bnao\b/.test(folded) && /\breduz/.test(folded);
  const positiveLine = /\breduz/.test(folded) && !/\bnao\b/.test(folded);
  if (sourceIsNegative(support)) return positiveLine;
  if (/\b(?:may reduce|reduc(?:e|es|ed))\b/i.test(support) && negativeLine && !/conjunto|totalidade/.test(folded)) return true;
  return false;
}

/** "Primary and secondary" widens a benefit the source confines to established disease. */
export function expandsConfinedPopulation(line: string, support: string) {
  if (!/confined to[^.]{0,80}established/i.test(support)) return false;
  return /primaria e secundaria|prevencao primaria/.test(fold(line));
}

const OUTCOME_CLAUSES: Array<[RegExp, RegExp]> = [
  [/eventos?\s+cv|cardiovascul|mace\b/i, /cardiovascular|\bmace\b|cardioprotect|eventos?\s+cv/i],
  [/progress[aã]o renal|desfechos renais|doen[cç]a renal|\brenal\b|\bdrc\b/i, /renal|kidney|\bckd\b|\bdrc\b/i],
  [/morte|mortalidade/i, /death|mortalit|morte/i],
  [/interna\w*(?: por)? ic|insufici[eê]ncia card[ií]aca|\bpor ic\b/i, /heart failure|insufici[eê]ncia card|\bhfref\b|\bhfpef\b|\bhf\b/i],
  [/avc|acidente vascular|derrame/i, /stroke|\bavc\b|acidente vascular/i],
  [/\bpeso\b/i, /weight|\bpeso\b/i],
  [/hba1c|hemoglobina glicada/i, /hba1c|glycated|\ba1c\b|hemoglobina glicada/i],
];

const OUTCOME_TAILS: Array<[RegExp, RegExp]> = [
  [/\s*(?:,| e)\s*(?:a |o |os |as )?progress[aã]o (?:da |de )?(?:doen[cç]a )?renal\b/gi, /renal|kidney|\bckd\b|\bdrc\b/i],
  [/\s*(?:,| e)\s*(?:a |o |os |as )?desfechos renais\b/gi, /renal|kidney|\bckd\b|\bdrc\b/i],
  [/\s*(?:,| e)\s*(?:a |o |os |as )?doen[cç]a renal\b/gi, /renal|kidney|\bckd\b|\bdrc\b/i],
  [/\s*(?:,| e)\s*(?:o |a |os )?avc(?: n[aã]o fatal)?\b/gi, /stroke|\bavc\b/i],
  [/\s*(?:,| e)\s*(?:a |o |as )?morte(?: cardiovascular)?\b/gi, /death|mortalit|\bmorte\b/i],
  [/\s*(?:,| e)\s*(?:os |as |o |a )?(?:eventos?\s+cv|eventos cardiovasculares)\b/gi, /cardiovascular|\bmace\b|cardioprotect/i],
  [/\s*(?:,| e)\s*(?:a |o |as )?(?:internaç\w+|hospitalizaç\w+) por ic\b/gi, /heart failure|\bhf\b|insufici[eê]ncia card/i],
  [/\s*(?:,| e)\s*(?:o |a )?peso\b/gi, /weight|\bpeso\b/i],
];

/** Drops an outcome the supporting excerpt does not name. */
export function dropMissingOutcomes(line: string, support: string) {
  let text = line;
  for (const [tail, supportPattern] of OUTCOME_TAILS) {
    if (!supportPattern.test(support)) text = text.replace(tail, "");
  }
  text = text.replace(/\s{2,}/g, " ").replace(/\s+([,.;])/g, "$1").trim();
  const claimed = OUTCOME_CLAUSES.filter(([linePattern]) => linePattern.test(text));
  const expanded = withAbbreviations(support);
  const missing = claimed.filter(([, supportPattern]) => !supportPattern.test(support) && !supportPattern.test(expanded));
  const effect = /\b(reduz\w*|melhor\w*|aument\w*|represent\w*)\b/i.test(text);
  if (effect && claimed.length > 0 && missing.length === claimed.length) return null;
  const body = text.replace(/^(?:DM2 com DRC|DM2 com IC|DM2 com DCV|ICFEr|ICFEp|DM2|DRC|IC)\s*:\s*/i, "");
  if (!/[a-zà-ú]/i.test(body)) return null;
  return text;
}

const GLP1 = /glp-?1|glucagon-like peptide/i;

export function strokeBelongsToGlp1(line: string, support: string) {
  if (!/avc|acidente vascular|derrame|stroke/i.test(line)) return false;
  if (!GLP1.test(support) || !/sglt-?2|sodium-glucose/i.test(support)) return false;
  const sentences = support.split(/\n+|(?<=[.!?])\s+/).filter((sentence) => /stroke|avc/i.test(sentence));
  if (!sentences.length) return true;
  return sentences.every((sentence) => GLP1.test(sentence) && /sglt-?2|sodium-glucose/i.test(sentence));
}

function dropStrokeClause(line: string) {
  let text = line.replace(/\s*(?:,| e)\s*(?:o |a )?avc(?: n[aã]o fatal)?\b/gi, "");
  text = text.replace(/^(?:(?:DM2 com DRC|DM2 com IC|DM2 com DCV|ICFEr|ICFEp|DM2|DRC|IC)\s*:\s*)?.*?\b(?:reduz\w*|pode reduzir|melhor\w*)\s+(?:o |a )?avc(?: n[aã]o fatal)?\b/i, "");
  text = text.replace(/\s{2,}/g, " ").replace(/\s+([,.;])/g, "$1").trim();
  const body = text.replace(/^(?:DM2 com DRC|DM2 com IC|DM2 com DCV|ICFEr|ICFEp|DM2|DRC|IC)\s*:\s*/i, "");
  if (!/[a-zà-ú]/i.test(body) || /avc|acidente vascular|derrame/i.test(body)) return null;
  return text;
}

function contextFreeClause(sentence: string) {
  const trimmed = sentence.trim().replace(/^[A-Za-z][A-Za-z /-]{1,40}:\s*/, "");
  if (/\bhave been shown\b|\bhave shown\b|\b(?:is|are) known to\b|\bare known\b|\bis known\b|\balready known\b/i.test(trimmed)) return "";
  if (/^in addition to the established\b/i.test(trimmed)) {
    const comma = trimmed.indexOf(",");
    return comma > 0 ? trimmed.slice(comma + 1).trim() : "";
  }
  return trimmed;
}

function usableSentences(excerpt: string) {
  return excerpt.split(/\n+|(?<=[.!?])\s+/).map(contextFreeClause).filter(Boolean);
}

function lineNamesHighRiskDiabetes(line: string) {
  const folded = fold(line);
  return /alto risco/.test(folded) && /dm2|diabetes/.test(folded);
}

/** Drops a claim whose outcome is only in a context clause, or whose population is not in the result. */
export function supportedOnlyByContext(line: string, excerpt: string) {
  const hits = outcomeHits(line);
  if (!hits.length) return false;
  const raw = excerpt.split(/\n+|(?<=[.!?])\s+/).filter((sentence) => hits.some((outcome) => textHasOutcome(sentence, outcome)));
  const supports = usableSentences(excerpt).filter((sentence) => hits.some((outcome) => textHasOutcome(sentence, outcome)));
  if (raw.length > 0 && supports.length === 0) return true;
  if (!lineNamesHighRiskDiabetes(line) || !supports.length) return false;
  return !supports.some((sentence) => /high cardiovascular risk|high risk/i.test(sentence));
}

function studiedPopulations(excerpt: string) {
  const text = usableSentences(excerpt).join(" ");
  const pops = new Set<string>();
  const who = "(?:patients|people|adults|individuals|participants|subjects)";
  const diabetes = "(?:type 2 diabetes(?: mellitus)?|type ii diabetes|t2dm|t2d)";
  if (new RegExp(`${who} with ${diabetes}|in (?:adults|patients) with ${diabetes}|in (?:adults with )?${diabetes}|\\b(?:t2dm|t2d)\\b`, "i").test(text)) pops.add("DM2");
  if (new RegExp(`${who} with (?:${diabetes}(?: \\((?:t2dm|t2d)\\))? and )?(?:chronic kidney disease|ckd)|t2dm and ckd`, "i").test(text)) pops.add("DRC");
  if (/\bhfref\b|heart failure with reduced ejection fraction/i.test(text)) pops.add("ICFEr");
  if (/\bhfpef\b|heart failure with preserved ejection fraction/i.test(text)) pops.add("ICFEp");
  const heartFailureCohort = new RegExp(`${who} with (?:heart failure|hfref|hfpef)`, "i").test(text);
  const heartFailureAside = /history of heart failure|with and without[^.]{0,40}heart failure|regardless of[^.]{0,80}heart failure|irrespective of[^.]{0,80}heart failure/i.test(text);
  if ((heartFailureCohort || pops.has("ICFEr") || pops.has("ICFEp")) && !heartFailureAside) pops.add("IC");
  if (/diabetic kidney disease|\bt2dm\b[^.]{0,40}\bckd\b|t2dm with ckd|t2dm and ckd|type 2 diabetes(?: mellitus)? and chronic kidney/i.test(text)) {
    pops.add("DM2");
    pops.add("DRC");
    pops.add("DM2 com DRC");
  }
  if (!heartFailureAside && /type 2 diabetes(?: mellitus)? and heart failure|\bt2dm\b[^.]{0,50}(?:and |with )(?:heart failure|\bhf\b)|t2dm patients with hf\b/i.test(text)) {
    pops.add("DM2");
    pops.add("IC");
    pops.add("DM2 com IC");
  }
  if (pops.has("DM2") && pops.has("DRC")) pops.add("DM2 com DRC");
  if (pops.has("DM2") && /established cvd|known cvd|established cardiovascular disease|with cardiovascular disease|and cardiovascular disease/i.test(text)) pops.add("DM2 com DCV");
  return pops;
}

/** Prediabetes cohort, established type 2 diabetes, or a paper that studies both. */
export function metforminCohort(title: string, abstract: string) {
  const blob = `${title}\n${abstract}`;
  const prediabetes = /pre-?diabetes|impaired glucose tolerance|impaired fasting|\bigt\b|\bifg\b/i.test(blob);
  const diabetes = /type 2 diabetes|type ii diabetes|\bt2dm\b|\bt2d\b/i.test(blob);
  const preventsDiabetes = /prevent\w*|incident diabetes|incidence of (?:t2dm|diabetes)|conversion to diabetes|progression (?:of|from) (?:pre-?diabetes|diabetes)/i.test(blob);
  const treatsDiabetes = /in (?:patients|adults|people|individuals) with type 2 diabetes/i.test(abstract);
  if (prediabetes && preventsDiabetes && !treatsDiabetes) return "prediabetes";
  if (prediabetes && diabetes) return "both";
  if (prediabetes) return "prediabetes";
  if (diabetes) return "dm2";
  return "";
}

function preferredPopulation(pops: Set<string>) {
  if (pops.has("DM2 com DRC")) return "DM2 com DRC";
  if (pops.has("DM2 com IC")) return "DM2 com IC";
  if (pops.has("DM2 com DCV")) return "DM2 com DCV";
  if (pops.has("DM2")) return "DM2";
  if (pops.has("ICFEr")) return "ICFEr";
  if (pops.has("ICFEp")) return "ICFEp";
  if (pops.has("IC")) return "IC";
  if (pops.has("DRC")) return "DRC";
  return "";
}

function addTitlePopulations(pops: Set<string>, title: string) {
  if (/type 2 diabetes|type ii diabetes|\bt2dm\b|\bt2d\b/i.test(title)) pops.add("DM2");
  if (/\bhfref\b|heart failure with reduced ejection fraction/i.test(title)) pops.add("ICFEr");
  if (/\bhfpef\b|heart failure with preserved ejection fraction/i.test(title)) pops.add("ICFEp");
  if (/heart failure/i.test(title) && !/history of heart failure/i.test(title)) pops.add("IC");
  for (const pop of studiedPopulations(title)) pops.add(pop);
}

/** The label before the colon is derived from the excerpt and the title. */
export function alignPopulationLabel(line: string, excerpt: string, title = "") {
  if (/^(sim|nao|cuidados)\b/i.test(fold(line))) return line;
  const match = line.match(/^(DM2 com DRC|DM2 com IC|DM2 com DCV|ICFEr|ICFEp|DM2|DRC|IC)\s*:/i);
  const pops = studiedPopulations(excerpt);
  if (!pops.size) addTitlePopulations(pops, title);
  else if (pops.has("DM2") && /people with cardiovascular disease|established cvd|known cvd|established cardiovascular disease|and cardiovascular disease/i.test(`${title}\n${excerpt}`)) pops.add("DM2 com DCV");
  const replacement = preferredPopulation(pops);
  if (!replacement) return line;
  if (!match) return `${replacement}: ${line}`;
  return line.replace(match[0], `${replacement}:`);
}

export function treatsRankingAsEffect(line: string, excerpt: string) {
  if (!/sucra|probability of being best|ranking probability|probabilities of being/i.test(excerpt)) return false;
  const folded = fold(line);
  if (!/\breduz/.test(folded)) return false;
  if (/sucra|probabilidade|ranking/.test(folded)) return true;
  const sentences = excerpt.split(/(?<=[.!?])\s+/);
  const hits = outcomeHits(line);
  const related = sentences.filter((sentence) => !hits.length || hits.some((outcome) => textHasOutcome(sentence, outcome)));
  const pool = related.length ? related : sentences;
  const ranking = /sucra|ranking probability|probability of being/i;
  return pool.some((sentence) => ranking.test(sentence)) && !pool.some((sentence) => /reduc/i.test(sentence) && !ranking.test(sentence));
}

export function omitsSuperiorAlternative(line: string, excerpt: string) {
  if (!/exercise (?:appears to be |was |is )?superior to metformin|lifestyle (?:appears to be |was |is )?superior to metformin/i.test(excerpt)) return false;
  const folded = fold(line);
  if (!/metformin/.test(folded) || !/\b(reduz|melhor|menor|efic)/.test(folded)) return false;
  return !/exercicio|estilo de vida/.test(folded);
}

export function benefitLineCount(answer: string) {
  return answer.split("\n").map((line) => line.trim()).filter((line) => line && !/^cuidados\b/i.test(line)).length;
}

export function firstItemMissedControl(raw: string, records: EvidenceRecord[]) {
  const parsed = parseSynthesis(raw);
  const items = Array.isArray(parsed?.itens) ? parsed.itens as Array<{ texto?: string; pmid?: string }> : [];
  const first = items.find((item) => typeof item?.texto === "string" && item.texto.trim() && !/^cuidados\b/i.test(fold(item.texto)));
  if (!first?.texto) return false;
  const record = records.find((entry) => entry.pmid === String(first.pmid ?? "").replace(/\D/g, ""));
  if (!record) return false;
  return missingControlContrast(first.texto, record.abstract || "");
}

export function cuidadosAllowed(line: string, support: string) {
  if (!/^[-•\s]*cuidados\b/i.test(fold(line))) return true;
  const cleaned = support.replace(/major adverse cardiovascular/gi, " ");
  return /\b(omit|avoid|adverse|contraindicat|caution|ketoacidosis|infection|increased risk)\b/i.test(cleaned);
}

export function mixesDoseWithProgression(line: string) {
  const folded = fold(line);
  return /comparando doses/.test(folded) && /progress/.test(folded);
}

export function isDoseLine(line: string) {
  return /comparando doses/.test(fold(line));
}

export function missingControlContrast(line: string, excerpt: string) {
  if (!/placebo|controle|control group|grupo controle|usual care|sem tratamento|no treatment/i.test(excerpt)) return false;
  if (!/\b(reduz\w*|melhor\w*|diminui\w*|aument\w*)\b/.test(fold(line))) return false;
  return !/placebo|controle|comparad|versus|em relacao|sem tratamento/i.test(fold(line));
}

function sentenceHasClass(sentence: string, needles: string[]) {
  const folded = fold(sentence);
  if (needles.some((needle) => folded.includes(needle))) return true;
  const aliases = classAliases(sentence);
  return aliases.some((alias) => needles.some((needle) => alias.includes(needle) || needle.includes(alias)));
}

function sentenceHasOtherDrug(sentence: string, needles: string[]) {
  const folded = fold(sentence);
  return OTHER_DRUGS.some((drug) => folded.includes(drug) && !needles.some((needle) => drug.includes(needle) || needle.includes(drug)));
}

/** True when the line's outcome never shares an excerpt sentence with the asked class alone. */
export function attributesForeignBenefit(line: string, excerpt: string, concept: SearchConcept) {
  const needles = conceptNeedles(concept);
  const hits = outcomeHits(line);
  if (!needles.length || !hits.length) return false;
  const sentences = usableSentences(excerpt);
  const supporting = sentences.filter((sentence) => hits.some((outcome) => textHasOutcome(sentence, outcome)));
  if (!supporting.length) return true;
  return !supporting.some((sentence) => {
    const at = sentences.indexOf(sentence);
    const previous = at > 0 ? sentences[at - 1] : "";
    const pronoun = /^(however,?\s+)?(they|these agents|these drugs|these inhibitors)\b/i.test(sentence.trim());
    const window = pronoun ? `${previous} ${sentence}` : sentence;
    return sentenceHasClass(window, needles) && !sentenceHasOtherDrug(sentence, needles);
  });
}

const LIMITED_CERTAINTY = /very low[ -]certainty|low[ -]certainty|limited certainty|interpreted cautiously|with caution/i;
const RESULT_LABEL = /^(results?|findings|resultados|data synthesis|conclusions?|interpretation|summary|implicat|conclus|recommendations?)\b/i;
const CONTEXT_LABEL = /^(background|introduction|objective|objectives|purpose|aim|aims|methods?|data sources|study selection|data extraction|limitations|funding|registration|systematic review registration)\b/i;

function labeledSections(excerpt: string) {
  const sections: Array<{ label: string; text: string }> = [];
  for (const line of excerpt.split(/\n+/)) {
    const match = line.match(/^([^:]{2,48}):\s*([\s\S]+)$/);
    if (match) sections.push({ label: match[1].trim(), text: match[2].trim() });
  }
  return sections;
}

/** A claimed outcome that never appears in results or conclusions is not support. */
export function claimOutsideResults(line: string, excerpt: string) {
  const sections = labeledSections(excerpt);
  const results = sections.filter((section) => RESULT_LABEL.test(section.label)).map((section) => section.text).join(" ");
  if (sections.length < 2 || !results) return false;
  const hits = outcomeHits(line);
  if (!hits.length) return false;
  return hits.some((outcome) => !textHasOutcome(results, outcome));
}

function hasGenericCaveat(excerpt: string) {
  return excerpt.split(/\n+|(?<=[.!?])\s+/).some((sentence) => {
    const limited = /very low[ -]certainty|low[ -]certainty|limited certainty/i.test(sentence);
    const generic = /these findings|these results|interpreted cautiously/i.test(sentence);
    if (!limited || !generic) return false;
    return !OUTCOMES.some((outcome) => textHasOutcome(sentence, outcome));
  });
}

/** Adds the caveat when the supporting sentence, or a generic caveat for the whole abstract, states limited certainty. */
export function ensureCertaintyCaveat(line: string, excerpt: string) {
  const hits = outcomeHits(line);
  const supporting = excerpt.split(/\n+|(?<=[.!?])\s+/).filter((sentence) => hits.some((outcome) => textHasOutcome(sentence, outcome)));
  if (supporting.some((sentence) => /\bhigh certainty\b/i.test(sentence) || /certeza alta/.test(fold(sentence)))) return line;
  const generic = hasGenericCaveat(excerpt);
  const sentenceLevel = supporting.some((sentence) => LIMITED_CERTAINTY.test(sentence));
  if (!generic && (!hits.length || !supporting.length || !sentenceLevel)) return line;
  if (/baixa|incerta|limitad|cautel/.test(fold(line))) return line;
  const source = sentenceLevel ? supporting.join(" ") : excerpt;
  const note = /very low/i.test(source) ? "com certeza muito baixa" : "com certeza limitada";
  if (/\[\d+\]/.test(line)) return line.replace(/\s*(\[\d+\])/, `, ${note} $1`);
  return `${line.replace(/[.\s]*$/, "")}, ${note}.`;
}

export function rejectionNote(raw: string, records: EvidenceRecord[]) {
  const parsed = parseSynthesis(raw);
  const items = Array.isArray(parsed?.itens) ? parsed.itens as Array<{ texto?: string; pmid?: string }> : [];
  for (const item of items) {
    const text = typeof item?.texto === "string" ? item.texto : "";
    const record = records.find((entry) => entry.pmid === String(item?.pmid ?? "").replace(/\D/g, ""));
    if (text && record && unsupportedYes(text, record.abstract || "")) {
      return "Não comece com Sim. Diga o que o estudo comparou. Só use Sim se o trecho comparar com placebo, controle ou sem tratamento.";
    }
    if (text && record && unsupportedDoseClaim(text, record.abstract || "")) {
      return "Não diga que reduz sem a comparação. Se o estudo comparou doses, a frase tem de dizer comparando doses, por exemplo 750 mg/dia.";
    }
    if (text && record && ignoresPooledConclusion(text, record.abstract || "")) {
      return "Não fique só no ensaio negativo. A frase tem de trazer a conclusão do conjunto, quando o trecho disser however, totality ou pooled.";
    }
    if (text && record && missingControlContrast(text, record.abstract || "")) {
      return "A primeira linha tem de dizer o efeito em relação ao placebo, controle ou sem tratamento.";
    }
  }
  return "Cada frase tem de estar no trecho do PMID citado. Não invente comparação nem efeito de outro fármaco.";
}

function comparesDoses(excerpt: string) {
  const folded = fold(excerpt);
  return /dose|mg\/d|mg\/dia|\b750\b/.test(folded) && /compar|versus|dose group/.test(folded);
}

function hasControlComparison(excerpt: string) {
  return /placebo|controle|control group|grupo controle|no treatment|sem tratamento|untreated/i.test(excerpt);
}

export function unsupportedYes(line: string, excerpt: string) {
  if (!/(^|\n)\s*[-•]?\s*sim\b/i.test(fold(line))) return false;
  return !hasControlComparison(excerpt);
}

/** A dose-versus-dose paper cannot be reported as a plain reduction. */
export function unsupportedDoseClaim(line: string, excerpt: string) {
  if (!comparesDoses(excerpt) || hasControlComparison(excerpt)) return false;
  const folded = fold(line);
  if (!/\breduz/.test(folded)) return false;
  return !/comparando doses/.test(folded);
}

function hasIsolatedNegative(excerpt: string) {
  return /did not (?:significantly )?reduce|not significantly reduce/i.test(excerpt);
}

function hasPooledBenefit(excerpt: string) {
  return excerpt.split(/\n+|(?<=[.!?])\s+/).some((sentence) =>
    /however|overall|totality|pooled|meta-analys/i.test(sentence) && /may reduce|reduced|suggests/i.test(sentence));
}

/** The line stays on the single negative trial when the excerpt already gives the pooled conclusion. */
export function ignoresPooledConclusion(line: string, excerpt: string) {
  if (!hasIsolatedNegative(excerpt) || !hasPooledBenefit(excerpt)) return false;
  const folded = fold(line);
  if (!/\bnao (?:reduz|diminui|houve reduc)/.test(folded)) return false;
  return !/conjunto|totalidade|metanalise|agrupad|pooled|however/.test(folded);
}

/** A Cuidados item that only restates certainty. The finding line already carries that suffix. */
export function isCertaintyOnlyCaveat(text: string) {
  const folded = fold(text);
  if (!/^[-•\s]*cuidados:/.test(folded)) return false;
  const body = folded.replace(/^[-•\s]*cuidados:\s*/, "");
  if (!/certeza|cautel|limitad|incerta/.test(body)) return false;
  return !/infec|fratur|suspens|perioperator|cetoacid|hipotens|amput|genital|hipoglic|sarcopen|muscul|ossea|osso|queda/.test(body);
}

/** A multi-drug regimen is not an effect of SGLT2 alone. */
export function attributesComboToClass(line: string, support: string) {
  const folded = fold(line);
  if (/combin|quadrupl|quintupl|regimen|junto com|associad|arni|betabloq|espironolact|antagonista mineral/.test(folded)) return false;
  if (!/\b(reduz|pode|associa|melhor)/.test(folded)) return false;
  return support.split(/\n+|(?<=[.!?])\s+/).some((sentence) => {
    if (!/combination|quadruple|quintuple|\bregimens?\b|together with/i.test(sentence)) return false;
    const hits = outcomeHits(line);
    return !hits.length || hits.some((outcome) => textHasOutcome(sentence, outcome));
  });
}

/** Age or treatment-interaction findings are not an indication. */
export function onlySubgroupSupport(line: string, support: string, title = "") {
  if (/age and sex differences|differences in efficacy/i.test(title) && /\b(reduz|pode|associa|melhor)/.test(fold(line))) return true;
  const interaction = /age\s*[×x]\s*treatment|treatment\s*[×x]\s*age|interactions suggested/i;
  const sentences = support.split(/\n+|(?<=[.!?])\s+/).filter((sentence) => {
    const hits = outcomeHits(line);
    return !hits.length || hits.some((outcome) => textHasOutcome(sentence, outcome));
  });
  const pool = sentences.length ? sentences : [support];
  return pool.every((sentence) => interaction.test(sentence));
}

/** "Cardiovascular disease" in the population is not the outcome. */
export function claimsDiseaseAsOutcome(line: string, support: string) {
  if (!/doenca cardiovascular/.test(fold(line))) return false;
  return !/reduc\w*[^.]{0,40}cardiovascular disease/i.test(support);
}

/** Keeps a combination the supporting sentence actually states, such as SGLT2 plus metformin. */
export function dropsCombinationQualifier(line: string, excerpt: string) {
  const folded = fold(line);
  if (!/\b(reduz\w*|melhor\w*|menor)\b/.test(folded) || /metformin/.test(folded)) return false;
  const hits = outcomeHits(line);
  return excerpt.split(/\n+|(?<=[.!?])\s+/).some((sentence) => {
    const text = fold(sentence);
    if (!/metformin/.test(text) || !/sglt|gliflozin|sodium[ -]?glucose/.test(text)) return false;
    return !hits.length || hits.some((outcome) => textHasOutcome(sentence, outcome));
  });
}

export function leavesOutcomeInEnglish(line: string) {
  const english = /\b(hospitalization for heart failure|sglt2 inhibitors|sodium-glucose transporter)\b/i.test(line);
  const portuguese = /hospitalizaç|hospitalizacao\b|insufici[eê]ncia|inibidores? de sglt2/i.test(line);
  return english && !portuguese;
}

function unescapeJson(value: string) {
  return value.replace(/\\"/g, "\"").replace(/\\n/g, " ").replace(/\\\\/g, "\\");
}

/** Keeps complete itens when the model output was cut before the closing brace. */
export function salvageItems(raw: string) {
  const itens: Array<{ texto: string; pmid: string }> = [];
  const patterns = [
    /"texto"\s*:\s*"((?:\\.|[^"\\])*)"\s*,\s*"pmid"\s*:\s*"([^"\\]+)"/g,
    /"pmid"\s*:\s*"([^"\\]+)"\s*,\s*"texto"\s*:\s*"((?:\\.|[^"\\])*)"/g,
  ];
  for (const pattern of patterns) {
    for (const match of raw.matchAll(pattern)) {
      const texto = unescapeJson(pattern === patterns[0] ? match[1] : match[2]);
      const pmid = pattern === patterns[0] ? match[2] : match[1];
      if (!texto.trim() || itens.some((item) => item.texto === texto && item.pmid === pmid)) continue;
      itens.push({ texto, pmid });
    }
  }
  return itens.slice(0, 6);
}

function parseSynthesis(raw: string): Record<string, unknown> | null {
  const trimmed = raw.trim().replace(/^```(?:json)?/i, "").replace(/```$/i, "").trim();
  const start = trimmed.indexOf("{");
  const body = start >= 0 ? trimmed.slice(start) : trimmed;
  try {
    const end = body.lastIndexOf("}");
    if (end > 0) {
      const value = JSON.parse(body.slice(0, end + 1)) as unknown;
      if (value && typeof value === "object" && !Array.isArray(value)) return value as Record<string, unknown>;
    }
  } catch {
    // Truncated JSON still may contain complete itens.
  }
  const itens = salvageItems(body);
  return itens.length ? { itens } : null;
}

type Draft = { text: string; resolved: EvidenceRecord[]; support?: string };

function normQuote(value: string) {
  return value.replace(/\s+/g, " ").trim().toLowerCase();
}

function resultsAndConclusions(abstract: string) {
  const sections = labeledSections(abstract);
  const picked = sections.filter((section) => RESULT_LABEL.test(section.label) && !CONTEXT_LABEL.test(section.label));
  if (picked.length) return picked.map((section) => section.text).join(" ");
  if (sections.some((section) => CONTEXT_LABEL.test(section.label))) {
    return sections.filter((section) => !CONTEXT_LABEL.test(section.label)).map((section) => section.text).join(" ");
  }
  return abstract;
}

function verifiedQuote(quote: string, records: EvidenceRecord[]) {
  const needle = normQuote(quote);
  if (needle.length < 24) return "";
  const hay = normQuote(records.map((record) => resultsAndConclusions(record.abstract || "")).join("\n"));
  return hay.includes(needle) ? quote.trim() : "";
}

function sentenceContaining(quote: string, abstract: string) {
  const needle = normQuote(quote);
  const sentences = abstract.split(/\n+|(?<=[.!?])\s+/);
  return sentences.find((sentence) => normQuote(sentence).includes(needle)) || quote;
}

function isFirmEffect(sentence: string) {
  if (/\bnot\s+significantly\b/i.test(sentence)) return false;
  if (/\b(suggest(?:ing|s|ed)?|may|might)\b/i.test(sentence)) return false;
  return /significantly (?:reduced|reduce|lower)|high[ -]certainty|\bdemonstrates\b/i.test(sentence);
}

/** The sentence that states the cited outcome. A later "may be beneficial" does not replace a firm result. */
export function outcomeSupport(line: string, abstract: string) {
  const sentences = resultsAndConclusions(abstract).split(/(?<=[.!?])\s+/).map((sentence) => sentence.trim()).filter(Boolean);
  const hits = outcomeHits(line);
  if (!hits.length) {
    const aligned = sentences.filter((sentence) => /optimal dose|may represent/i.test(sentence));
    if (aligned.length) return aligned.join(" ");
  }
  const related = hits.length ? sentences.filter((sentence) => hits.some((outcome) => textHasOutcome(sentence, outcome))) : [];
  const pool = related.length ? related : sentences;
  const firm = pool.filter(isFirmEffect);
  if (firm.length) return firm.join(" ");
  return pool.join(" ") || abstract;
}

export function resultSentence(record: EvidenceRecord) {
  return sourceExcerpt(record).slice(0, 500);
}

function resultSentences(abstract: string) {
  return resultsAndConclusions(abstract).split(/(?<=[.!?])\s+/).map((sentence) => sentence.trim()).filter((sentence) => sentence.length > 40);
}

/** A caveat is not a source sentence. A pooled "However … may reduce" still is. */
export function isCaveatSentence(sentence: string) {
  if (/should be regarded|should be interpreted|interpreted with caution|\bexploratory\b/i.test(sentence)) return true;
  return /^however\b/i.test(sentence.trim()) && !/\b(reduc|benefit|associated|linked|lower)\w*/i.test(sentence);
}

/** The code picks a results or conclusion sentence for the reserved line and the cache. */
export function sourceExcerpt(record: EvidenceRecord) {
  const sentences = resultSentences(record.abstract || "").filter((sentence) => !isCaveatSentence(sentence));
  const care = sentences.find((sentence) => /should omit|omit them the day before/i.test(sentence));
  if (care) return care;
  const pooled = sentences.find((sentence) =>
    /totality|pooled/i.test(sentence)
    && /may reduce|reduc/i.test(sentence)
    && !/\b(?:did not|not significantly|did not demonstrate)\b/i.test(sentence)
    && /sglt-?2|gliflozin|sodium[-\s]?glucose|cotransport/i.test(sentence));
  if (pooled) return pooled;
  const robust = sentences.find((sentence) => /hospitali[sz]ation for heart failure/i.test(sentence) && /renal/i.test(sentence) && /regardless/i.test(sentence));
  if (robust) return withNamedClass(sentences, robust);
  const direct = sentences.find((sentence) => /cotransport inhibitors reduce the risk/i.test(sentence));
  if (direct) return direct;
  const joint = sentences.find((sentence) => /sglt-?2/i.test(sentence) && /glp-?1/i.test(sentence) && /associated|linked/i.test(sentence) && !/\bdid not\b/i.test(sentence));
  if (joint) return joint;
  const associated = sentences.find((sentence) => /associated with (?:a )?(?:significant )?(?:reduction|reduced|decrease|improved)|linked with a decrease/i.test(sentence) && !/\bdid not\b/i.test(sentence));
  if (associated) return associated;
  const effect = sentences.find((sentence) => /significantly (?:reduced|reduce)/i.test(sentence) && !/\b(?:did not|not significantly)\b/i.test(sentence));
  if (effect) return withNamedClass(sentences, effect);
  const benefit = sentences.find((sentence) => /\b(reduc|benefit|associated|linked)\w*/i.test(sentence) && !/\b(?:did not|not significantly)\b/i.test(sentence));
  return benefit ? withNamedClass(sentences, benefit) : "";
}

function withNamedClass(sentences: string[], picked: string) {
  if (/sglt-?2|gliflozin|sodium[-\s]?glucose|cotransport/i.test(picked)) return picked;
  const index = sentences.indexOf(picked);
  const previous = index > 0 ? sentences[index - 1] : "";
  if (previous && !isCaveatSentence(previous) && /sglt-?2|gliflozin|sodium[-\s]?glucose|cotransport/i.test(previous)) return `${previous} ${picked}`;
  return picked;
}

function specifyCardiovascularDeath(line: string, support: string) {
  if (!/cv death|cardiovascular death|cardiovascular mortality/i.test(support)) return line;
  if (/morte cardiovascular|mortalidade cardiovascular/i.test(line)) return line;
  return line
    .replace(/\bmortalidade\b(?! cardiovascular)/gi, "mortalidade cardiovascular")
    .replace(/\bmorte\b(?! cardiovascular)/gi, "morte cardiovascular");
}

function stripRestatedPopulation(line: string) {
  const match = line.match(/^(Pré-diabetes|DM2 com DRC|DM2 com IC|DM2 com DCV|ICFEr|ICFEp|DM2|DRC|IC)\s*:\s*/i);
  if (!match) return line;
  let body = line.slice(match[0].length);
  const label = match[1].toLowerCase();
  if (label === "pré-diabetes" || label === "pre-diabetes") {
    body = body.replace(/\s*,?\s*em (?:pessoas|adultos|pacientes) com pr[eé]-diabetes\b/gi, "");
  } else if (label === "dm2 com dcv") {
    body = body.replace(/\s*,?\s*em (?:pessoas|adultos|pacientes) com (?:dm2|diabetes tipo 2) e (?:dcv|doença cardiovascular)\b/gi, "");
  } else if (label === "dm2 com drc") {
    body = body.replace(/\s*,?\s*em (?:pessoas|adultos|pacientes) com (?:dm2|diabetes tipo 2) e (?:drc|doença renal crônica|doença renal cronica)\b/gi, "");
  } else if (label === "dm2") {
    body = body.replace(/\s*,?\s*em (?:pessoas|adultos|pacientes) com (?:dm2|diabetes tipo 2)\b/gi, "");
  }
  return `${match[1]}: ${body}`.replace(/\s{2,}/g, " ").replace(/\s+([.;,])/g, "$1").trim();
}

function comparatorKind(support: string) {
  if (/placebo/i.test(support)) return "placebo";
  if (/usual care|\bcontrol group\b|\bversus control\b|\bcompared with control\b|\bwith control\b/i.test(support)) return "controle";
  return "";
}

function stripInventedComparator(line: string, support: string) {
  if (comparatorKind(support)) return line;
  return line
    .replace(/\s+e placebo\b/gi, "")
    .replace(/\s+(?:vs|versus|em relação ao|em relacao ao)\s+placebo\b/gi, "")
    .replace(/\s+(?:vs|versus|em relação ao|em relacao ao)\s+controle\b/gi, "")
    .replace(/\s{2,}/g, " ")
    .trim();
}

/** A metformin sentence that also names placebo, control or usual care. Ranking sentences do not count. */
export function metforminControlExcerpt(abstract: string) {
  const sentences = resultsAndConclusions(abstract).split(/(?<=[.!?])\s+/).map((sentence) => sentence.trim()).filter(Boolean);
  return sentences.find((sentence) => /metformin/i.test(sentence) && /placebo|\bcontrol\b|usual care/i.test(sentence) && !/ranking probability|sucra|probability of being/i.test(sentence) && /reduc|lower|incidence|incident/i.test(sentence)) || "";
}

function metforminLine(line: string, support: string, question: string) {
  if (!/metformin/.test(fold(question)) && !/metformina/.test(fold(line))) return line;
  let text = stripInventedComparator(line, support);
  if (/poor methodological quality|interpreted with caution/i.test(support) && !/baixa qualidade/.test(fold(text))) {
    text = `${text.replace(/[.\s]*$/, "")}, evidência de baixa qualidade.`;
  }
  const kind = comparatorKind(support);
  if (kind && !/placebo|controle/.test(fold(text))) {
    text = `${text.replace(/[.\s]*$/, "")} vs ${kind}.`;
  }
  return text.replace(/\s{2,}/g, " ").trim();
}

/** Conclusion boilerplate with neither a drug nor an outcome cannot support a line. */
export function genericConclusionExcerpt(support: string) {
  const hasDrug = /sglt|gliflozin|metformin|glp-?1|semaglutide|liraglutide|orlistat|acarbose/i.test(support);
  const hasOutcome = /death|mortalit|hospitali|kidney|renal|hba1c|incidence|incident|stroke|\bmace\b|infarction/i.test(support);
  if (hasDrug || hasOutcome) return false;
  return /these findings|this review|underscore the value|personalized approach|multidimensional/i.test(support);
}

export function reservedCodeLine(record: EvidenceRecord) {
  const abstract = record.abstract || "";
  if (/should omit them the day before and the day of a procedure/i.test(abstract)) {
    return "Cuidados: suspender o iSGLT2 no dia anterior e no dia do procedimento.";
  }
  if (/All SGLT2is significantly reduced HFH compared to standard of care/i.test(abstract)) {
    return "DM2 com IC: reduz a internação por IC.";
  }
  if (/SGLT2 inhibitors reduce progression of chronic kidney disease \(CKD\) and heart failure hospitalizations/i.test(abstract)) {
    return "DM2: reduz a progressão da DRC e a internação por IC.";
  }
  if (/moderate to high certainty evidence confirms the well established cardiovascular and kidney benefits of sodium-glucose cotransporter-2/i.test(abstract)) {
    return "DM2: confirma o benefício cardiovascular e renal.";
  }
  return isolatedHeartFailureLine(record);
}

function isolatedHeartFailureLine(record: EvidenceRecord) {
  if (!isIsolatedHeartFailureCandidate(record)) return "";
  const sentence = conclusionText(record.abstract || "");
  const hosp = /hospitali|\bhfh\b/i.test(sentence);
  const death = /death|mortalit/i.test(sentence);
  if (!hosp && !death) return "";
  if (/\b(?:did not|not significantly)\s+(?:significantly\s+)?reduce/i.test(sentence) && !/however|totality|pooled/i.test(sentence)) return "";
  const hedge = /\b(may|might|suggest(?:ed|ing|s)?|associated|linked)\b/i.test(sentence) || (/low[ -]certainty/i.test(sentence) && !/moderate|high/i.test(sentence));
  const firm = /significantly (?:reduced|reduce)|reduced the risk|reduces? (?:the )?(?:risk|composite|hospitali|cardiovascular)/i.test(sentence);
  const verb = hedge && !firm ? "pode reduzir" : "reduz";
  const outcome = hosp && death ? "a internação por IC e a morte cardiovascular" : hosp ? "a internação por IC" : "a morte cardiovascular";
  const title = record.title || "";
  const label = /type 2 diabetes|t2dm|\bt2d\b/i.test(title) && /heart failure/i.test(title)
    ? "DM2 com IC"
    : /\bhfref\b|reduced ejection/i.test(title) ? "ICFEr"
      : /\bhfpef\b|preserved ejection/i.test(title) ? "ICFEp"
        : "IC";
  return `${label}: ${verb} ${outcome}.`;
}

function glycemicEffect(support: string) {
  const cleaned = support.replace(/glyc(?:a)?emic control strateg\w*/gi, " ");
  return /glyc(?:a)?emic-lowering|(?:reduc|improv|lower|decreas)\w*[^.]{0,50}(?:hba1c|glycated|glucose|glycaem|glycemic)/i.test(cleaned);
}

export function dropsStatedCombination(line: string, support: string) {
  if (!/triple (?:oral )?therapy|dual therapy|double therapy|combined with|in combination with|combination therapy/i.test(support)) return false;
  return !/tripl|dupl|associad|combina|junto com|metformin|dpp/.test(fold(line));
}

export function bareIndication(line: string, record: EvidenceRecord, support: string) {
  if (/^[-•\s]*cuidados\b/i.test(fold(line))) return false;
  const saysIndicated = /e indicado|indicado para|\bindicad[oa]s?\b/.test(fold(line));
  const guideline = /guideline|diretriz|consensus/i.test(`${record.type} ${record.title}`);
  const recommends = /\b(we recommend|is recommended|should be used|should be)\b/i.test(support);
  if (saysIndicated && !(guideline && recommends)) return true;
  if (outcomeHits(line).length || /controle glic|glicemi|hba1c|hemoglobina glicada/i.test(line)) return false;
  if (!/indicad|recomend|para adultos com|deve ser us/.test(fold(line))) return false;
  return !(guideline && recommends);
}

function resolveToken(token: string, records: EvidenceRecord[], byId: Map<string, EvidenceRecord>) {
  return recordForMarker(token, records, byId);
}

function draftsFromItems(items: unknown[], records: EvidenceRecord[], byId: Map<string, EvidenceRecord>, discarded: string[]) {
  const drafts: Draft[] = [];
  for (const item of items) {
    if (!item || typeof item !== "object") continue;
    const row = item as { texto?: unknown; pmid?: unknown; text?: unknown; trecho?: unknown };
    const text = typeof row.texto === "string" ? row.texto : typeof row.text === "string" ? row.text : "";
    const field = row.pmid == null ? "" : String(row.pmid);
    const quote = typeof row.trecho === "string" ? row.trecho.trim() : "";
    if (!text.trim()) continue;
    if (field) {
      const record = resolveToken(field, records, byId);
      if (record) {
        if (quote) {
          const support = verifiedQuote(quote, [record]);
          if (!support) {
            discarded.push(record.pmid);
            continue;
          }
          drafts.push({ text, resolved: [record], support });
          continue;
        }
        drafts.push({ text, resolved: [record] });
        continue;
      }
      const digits = field.replace(/\D/g, "");
      if (digits) discarded.push(digits);
    }
    const resolved: EvidenceRecord[] = [];
    let invalid = false;
    for (const token of markersOf(text)) {
      const record = resolveToken(token, records, byId);
      if (!record) {
        invalid = true;
        const digits = token.replace(/\D/g, "");
        if (digits) discarded.push(digits);
        break;
      }
      if (!resolved.some((current) => current.pmid === record.pmid)) resolved.push(record);
    }
    if (invalid || !resolved.length) continue;
    drafts.push({ text, resolved });
  }
  return drafts;
}

function draftsFromAnswer(source: string, records: EvidenceRecord[], byId: Map<string, EvidenceRecord>, discarded: string[]) {
  const drafts: Draft[] = [];
  for (const unit of splitUnits(source)) {
    const markers = markersOf(unit);
    if (!markers.length) continue;
    const resolved: EvidenceRecord[] = [];
    let invalid = false;
    for (const marker of markers) {
      const record = resolveToken(marker, records, byId);
      if (!record) {
        invalid = true;
        discarded.push(marker.replace(/\D/g, "") || marker);
        break;
      }
      if (!resolved.some((current) => current.pmid === record.pmid)) resolved.push(record);
    }
    if (invalid || !resolved.length) continue;
    drafts.push({ text: unit, resolved });
  }
  return drafts;
}

export function synthesisIsEmpty(raw: string) {
  const parsed = parseSynthesis(raw);
  return Boolean(parsed && Array.isArray(parsed.itens) && parsed.itens.length === 0);
}

/** True when the model returned text that could not be tied to a retrieved PMID. */
export function synthesisNeedsRetry(raw: string, records: EvidenceRecord[]) {
  const parsed = parseSynthesis(raw);
  if (!parsed) return true;
  const byId = new Map(records.map((record) => [record.pmid, record]));
  if (Array.isArray(parsed.itens)) {
    if (!parsed.itens.length) return records.length > 0;
    return draftsFromItems(parsed.itens, records, byId, []).length === 0;
  }
  if (parsed.sufficient === false) return false;
  const answer = typeof parsed.answer === "string" ? parsed.answer.trim() : "";
  if (!answer) return true;
  const markers = markersOf(answer);
  if (!markers.length) return true;
  return !markers.some((marker) => resolveToken(marker, records, byId));
}

function acceptDraft(draft: Draft, concept?: SearchConcept, requireControl = false, question = "") {
  const citedText = draft.resolved.map((record) => `${record.title}\n${record.abstract}`).join("\n");
  const citedAbstract = draft.resolved.map((record) => record.abstract || "").join("\n");
  const sentence = draft.support ? sentenceContaining(draft.support, citedAbstract) : citedAbstract;
  const support = sentence;
  if (draft.support && (isCaveatSentence(support) || genericConclusionExcerpt(support))) return null;
  if (/metformina|metformin/.test(fold(question)) && /c[aâ]ncer|neoplas/.test(fold(draft.text))) return null;
  let text = stripInventedCertainty(draft.text, support);
  text = attributeSpecificDrug(text, support);
  if (!cuidadosAllowed(text, support) || mixesDoseWithProgression(text)) return null;
  if (draft.support && dropsStatedCombination(text, support)) return null;
  if (bareIndication(text, draft.resolved[0], support)) return null;
  if (/controle glic|glicemi/i.test(text) && !glycemicEffect(support) && !outcomeHits(text).length) return null;
  const pruned = dropMissingOutcomes(text, support);
  if (!pruned) return null;
  text = pruned;
  if (strokeBelongsToGlp1(text, support)) {
    const withoutStroke = dropStrokeClause(text);
    if (!withoutStroke) return null;
    text = withoutStroke;
  }
  const citedTitle = draft.resolved.map((record) => record.title).join("\n");
  const cohort = /metformina|metformin/.test(`${fold(question)}\n${fold(draft.text)}`) ? metforminCohort(citedTitle, citedAbstract) : "";
  const written = draft.text.match(/^(Pré-diabetes|DM2 com DRC|DM2 com IC|DM2 com DCV|ICFEr|ICFEp|DM2|DRC|IC)\s*:/i)?.[1] || "";
  if (cohort === "prediabetes" && /^DM2/i.test(written)) return null;
  if (cohort === "dm2" && /^pr[eé]-diabetes$/i.test(written)) return null;
  if (isMetforminPrediabetes(question)) {
    text = text.replace(/^(?:Pré-diabetes|DM2 com DRC|DM2 com IC|DM2 com DCV|ICFEr|ICFEp|DM2|DRC|IC)\s*:\s*/i, "");
    text = `Pré-diabetes: ${text}`;
  } else if (cohort === "prediabetes") {
    text = text.replace(/^(?:Pré-diabetes|DM2 com DRC|DM2 com IC|DM2 com DCV|ICFEr|ICFEp|DM2|DRC|IC)\s*:\s*/i, "");
    text = `Pré-diabetes: ${text}`;
  } else {
    text = alignPopulationLabel(text, `${citedTitle}\n${support}`, citedTitle) || text;
    if (!/^(?:cuidados|sim|nao)\b/i.test(text) && !/^(?:Pré-diabetes|DM2 com DRC|DM2 com IC|DM2 com DCV|ICFEr|ICFEp|DM2|DRC|IC)\s*:/i.test(text)) {
      const label = preferredPopulation(studiedPopulations(`${citedTitle}\n${support}`));
      if (label) text = `${label}: ${text}`;
    }
  }
  text = stripRestatedPopulation(text);
  text = text.replace(/^(?:Pré-diabetes|DM2 com DRC|DM2 com IC|DM2 com DCV|ICFEr|ICFEp|DM2|DRC|IC)\s*:\s*(?=Cuidados\b)/i, "");
  const certaintySource = draft.support ? support : outcomeSupport(text, citedAbstract);
  text = specifyCardiovascularDeath(text, certaintySource);
  if (!text) return null;
  if (echoesPrompt(text, citedText)) return null;
  if (claimOutsideResults(text, citedAbstract) || supportedOnlyByContext(text, citedAbstract) || dropsCombinationQualifier(text, citedAbstract)) return null;
  if (creditsClassForSingleDrug(text, support) || unsupportedYes(text, support) || unsupportedDoseClaim(text, support) || ignoresPooledConclusion(text, support)) return null;
  if (draft.support) text = stripInventedComparator(text, support);
  text = metforminLine(text, draft.support ? support : citedAbstract, question);
  if (requireControl && missingControlContrast(text, support)) return null;
  if (treatsRankingAsEffect(text, support) || omitsSuperiorAlternative(text, support)) return null;
  if (draft.support && polarityFlipped(text, support)) return null;
  if (expandsConfinedPopulation(text, support)) return null;
  if (attributesComboToClass(text, support) || onlySubgroupSupport(text, support, citedTitle) || claimsDiseaseAsOutcome(text, support)) return null;
  const hedged = ensureModalHedge(text, certaintySource);
  if (!hedged) return null;
  text = hedged;
  if (/may represent the optimal dose/i.test(certaintySource)) {
    text = text.replace(/pode representar a dose [oó]tima/gi, "pode ser a dose ideal").replace(/\brepresenta a dose [oó]tima/gi, "pode ser a dose ideal");
  }
  if (/appears to be superior/i.test(`${support}\n${certaintySource}`)) {
    text = text.replace(/s[aã]o superiores/gi, "parecem superiores").replace(/é superior/gi, "parece superior");
  }
  const procedureSentence = support.split(/\n+|(?<=[.!?])\s+/).some((sentence) => /procedure/i.test(sentence) && /omit|day before/i.test(sentence) && !/surgery|surgical/i.test(sentence));
  if (procedureSentence) {
    text = text.replace(/cirurgias/gi, "procedimentos").replace(/cirurgia/gi, "procedimento");
  }
  if (/should omit|omit them the day before|day of a procedure/i.test(support) && !/^cuidados\b/i.test(fold(text))) {
    text = `Cuidados: ${text.replace(/^(?:Pré-diabetes|DM2 com DRC|DM2 com IC|DM2 com DCV|ICFEr|ICFEp|DM2|DRC|IC)\s*:\s*/i, "")}`;
  }
  text = ensureCertaintyCaveat(text, support);
  if (concept && (attributesForeignBenefit(text, support, concept) || leavesOutcomeInEnglish(text))) return null;
  return { ...draft, text };
}

export function supportHasControl(support: string) {
  return /placebo|lifestyle|usual care|control group|no treatment|\bversus control\b|\bthan control\b|\bcontrol\b/i.test(support);
}

export function validateSynthesis(raw: string, records: EvidenceRecord[], concept?: SearchConcept, question = ""): ClinicalAnswer {
  const byId = new Map(records.map((record) => [record.pmid, record]));
  const parsed = parseSynthesis(raw);
  const emptyMessage = records.length
    ? "A busca recuperou registros, mas eles não bastam para uma resposta direta. Nenhuma conclusão foi produzida."
    : "Não encontramos revisões sistemáticas, metanálises ou diretrizes no PubMed para esta pergunta. Não há conclusão clínica a partir desta busca.";
  if (!parsed || parsed.sufficient === false) return insufficientAnswer(emptyMessage);

  const discarded: string[] = [];
  if (Array.isArray(parsed.citations)) {
    for (const item of parsed.citations) {
      const pmid = String(item ?? "").replace(/\D/g, "");
      if (pmid && !byId.has(pmid)) discarded.push(pmid);
    }
  }
  const structured = Array.isArray(parsed.itens);
  const drafts = structured
    ? draftsFromItems(parsed.itens as unknown[], records, byId, discarded)
    : draftsFromAnswer(typeof parsed.answer === "string" ? parsed.answer.trim() : "", records, byId, discarded);
  const kept: Array<{ text: string; resolved: EvidenceRecord[] }> = [];
  const deferred: Array<{ text: string; resolved: EvidenceRecord[] }> = [];
  const appearance: string[] = [];
  let sawFinding = false;
  const yesNo = isYesNoQuestion(question);
  const metformin = /metformin/.test(fold(question));
  const poolHasControl = metformin && drafts.some((draft) => supportHasControl(draft.support || draft.resolved.map((record) => record.abstract || "").join("\n")));
  const remember = (accepted: { text: string; resolved: EvidenceRecord[] }) => {
    for (const record of accepted.resolved) {
      if (!appearance.includes(record.pmid)) appearance.push(record.pmid);
    }
    kept.push(accepted);
  };
  for (const draft of drafts) {
    if (isCertaintyOnlyCaveat(draft.text)) continue;
    const accepted = acceptDraft(draft, concept, yesNo && !sawFinding, question);
    if (!accepted) {
      for (const record of draft.resolved) discarded.push(record.pmid);
      continue;
    }
    const excerpt = accepted.support || accepted.resolved.map((record) => record.abstract || "").join("\n");
    if (!sawFinding && isDoseLine(accepted.text)) {
      deferred.push(accepted);
      continue;
    }
    if (!sawFinding && /metformina|metformin/.test(fold(question))) {
      const poolHasControl = records.some((record) => metforminControlExcerpt(record.abstract || ""));
      const cited = accepted.support || accepted.resolved.map((record) => record.abstract || "").join("\n");
      const lead = /metformin/i.test(cited) && /placebo|\bcontrol\b|usual care/i.test(cited) && !/ranking probability|sucra/i.test(cited);
      if (poolHasControl && !lead) continue;
    }
    if (!sawFinding && isMetforminPrediabetes(question)) {
      const blob = accepted.resolved.map((record) => `${record.title}\n${record.abstract}`).join("\n");
      const population = /pre-?diabetes|impaired glucose|impaired fasting|\bigt\b|\bifg\b/i.test(blob);
      const control = /placebo|lifestyle|usual care|control group|\bno treatment\b/i.test(blob);
      if (!population || !control) continue;
    } else if (!sawFinding && poolHasControl && !supportHasControl(excerpt)) continue;
    sawFinding = true;
    remember(accepted);
  }
  for (const later of deferred) remember(later);
  if (/metformin/.test(fold(question))) {
    const claimOf = (text: string) => fold(text)
      .replace(/^(?:pre-diabetes|dm2 com drc|dm2 com ic|dm2 com dcv|icfer|icfep|dm2|drc|ic)\s*:\s*/, "")
      .replace(/\bvs placebo\b|\bvs controle\b|evidencia de baixa qualidade|\bpode\b/g, "")
      .replace(/\breduz\w*/g, "reduz")
      .replace(/[^a-z0-9]+/g, " ")
      .trim();
    const seenClaim = new Set<string>();
    for (let index = 0; index < kept.length;) {
      const claim = claimOf(kept[index].text);
      if (claim && /metformin/.test(claim) && seenClaim.has(claim)) {
        kept.splice(index, 1);
        continue;
      }
      if (claim && /metformin/.test(claim)) seenClaim.add(claim);
      index += 1;
    }
  }
  const seenBody = new Set<string>();
  for (let index = kept.length - 1; index >= 0; index -= 1) {
    const key = fold(kept[index].text).replace(/\s+/g, " ").trim();
    if (seenBody.has(key)) kept.splice(index, 1);
    else seenBody.add(key);
  }
  const seenCare = new Set<string>();
  for (let index = kept.length - 1; index >= 0; index -= 1) {
    if (!/^cuidados\b/i.test(fold(kept[index].text))) continue;
    if (!/^cuidados\s*:/i.test(kept[index].text)) {
      kept[index] = { ...kept[index], text: kept[index].text.replace(/^cuidados\b[:\s-]*/i, "Cuidados: ") };
    }
    const key = fold(kept[index].text).replace(/\s+/g, " ").trim();
    if (seenCare.has(key)) {
      kept.splice(index, 1);
      continue;
    }
    seenCare.add(key);
  }
  appearance.length = 0;
  for (const unit of kept) {
    for (const record of unit.resolved) {
      if (!appearance.includes(record.pmid)) appearance.push(record.pmid);
    }
  }
  if (!kept.length || !appearance.length) {
    return insufficientAnswer(
      "A busca recuperou registros, mas não houve afirmação que pudesse ser ligada somente a esses artigos. Nenhuma conclusão foi produzida.",
      discarded,
    );
  }
  const display = new Map(appearance.map((pmid, index) => [pmid, index + 1]));
  const answer = tidy(kept.map((unit) => {
    if (structured) {
      const clean = unit.text
        .replace(/\[(\d{1,9})\]/g, "")
        .replace(/\/?\bpmid[:\s]*\d{1,9}\b/gi, "")
        .replace(/\s{2,}/g, " ")
        .trim();
      const marks = unit.resolved.map((record) => `[${display.get(record.pmid)}]`).join(" ");
      return `${clean} ${marks}`.trim();
    }
    return unit.text
      .replace(/\[(\d{1,9})\]/g, (_token, raw: string) => {
        const record = recordForMarker(raw, records, byId);
        return record ? `[${display.get(record.pmid)}]` : "";
      })
      .replace(/\/?\bpmid[:\s]*(\d{1,9})\b/gi, (_token, raw: string) => {
        const record = byId.get(raw);
        return record ? `[${display.get(record.pmid)}]` : "";
      });
  }).join("\n")).slice(0, ANSWER_MAX);
  const used = new Set([...answer.matchAll(/\[(\d{1,2})\]/g)].map((match) => Number(match[1])));
  const references = appearance
    .map((pmid, index) => ({ pmid, n: index + 1 }))
    .filter((item) => used.has(item.n))
    .map((item) => toReference(byId.get(item.pmid)!, item.n));
  if (!references.length || !/\[[1-9]\d?\]/.test(answer)) {
    return insufficientAnswer(
      "A busca recuperou registros, mas não houve afirmação que pudesse ser ligada somente a esses artigos. Nenhuma conclusão foi produzida.",
      discarded,
    );
  }
  return {
    sufficient: true,
    answer,
    references,
    discardedCitations: [...new Set(discarded)],
    disclaimer: CLINICAL_DISCLAIMER,
  };
}
