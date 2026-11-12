import type { ClinicalAnswer, ClinicalReference, EvidenceRecord } from "./types";
import type { SearchConcept } from "./terms";
import { classAliases, conceptNeedles } from "./select";
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

function tidy(text: string) {
  return text
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

const OUTCOME_PAIRS: Array<[string, string]> = [
  ["hospitalization", "hospitalizacao"],
  ["heart failure", "insuficiencia cardiaca"],
  ["mortality", "mortalidade"],
  ["cardiovascular", "cardiovascular"],
  ["kidney", "renal"],
  ["albuminuria", "albuminuria"],
  ["fracture", "fratura"],
  ["weight", "peso"],
  ["myocardial", "infarto"],
  ["infection", "infec"],
  ["genital", "genital"],
];

const OTHER_DRUGS = ["semaglutide", "liraglutide", "dulaglutide", "tirzepatide", "exenatide", "insulin", "sitagliptin"];

function outcomeHits(line: string) {
  const folded = fold(line);
  return OUTCOME_PAIRS.filter(([english, portuguese]) => folded.includes(portuguese) || folded.includes(english));
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
  const sentences = excerpt.split(/\n+|(?<=[.!?])\s+/);
  const supporting = sentences.filter((sentence) => {
    const folded = fold(sentence);
    return hits.some(([english, portuguese]) => folded.includes(english) || folded.includes(portuguese));
  });
  if (!supporting.length) return true;
  return !supporting.some((sentence) => sentenceHasClass(sentence, needles) && !sentenceHasOtherDrug(sentence, needles));
}

const LIMITED_CERTAINTY = /very low[ -]certainty|low[ -]certainty|limited certainty|interpreted cautiously|with caution/i;

/** Adds the caveat only when the sentence that supports this outcome states limited certainty. */
export function ensureCertaintyCaveat(line: string, excerpt: string) {
  const hits = outcomeHits(line);
  if (!hits.length) return line;
  const supporting = excerpt.split(/\n+|(?<=[.!?])\s+/).filter((sentence) => {
    const folded = fold(sentence);
    return hits.some(([english, portuguese]) => folded.includes(english) || folded.includes(portuguese));
  });
  if (!supporting.length || !supporting.some((sentence) => LIMITED_CERTAINTY.test(sentence))) return line;
  if (/baixa|incerta|limitad|cautel/.test(fold(line))) return line;
  const note = supporting.some((sentence) => /very low/i.test(sentence)) ? "com certeza muito baixa" : "com certeza limitada";
  if (/\[\d+\]/.test(line)) return line.replace(/\s*(\[\d+\])/, `, ${note} $1`);
  return `${line.replace(/[.\s]*$/, "")}, ${note}.`;
}

export function unsupportedYes(line: string, excerpt: string) {
  if (!/(^|\n)\s*[-•]?\s*sim\b/i.test(fold(line))) return false;
  return !/placebo|controle|control group|grupo controle|no treatment|sem tratamento|untreated/i.test(excerpt);
}

export function leavesOutcomeInEnglish(line: string) {
  const english = /\b(hospitalization for heart failure|sglt2 inhibitors|sodium-glucose transporter)\b/i.test(line);
  const portuguese = /hospitalizaç|hospitalizacao\b|insufici[eê]ncia|inibidores? de sglt2/i.test(line);
  return english && !portuguese;
}

function parseSynthesis(raw: string): Record<string, unknown> | null {
  try {
    const trimmed = raw.trim().replace(/^```(?:json)?/i, "").replace(/```$/i, "").trim();
    const start = trimmed.indexOf("{");
    const end = trimmed.lastIndexOf("}");
    if (start < 0 || end <= start) return null;
    const value = JSON.parse(trimmed.slice(start, end + 1)) as unknown;
    return value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : null;
  } catch {
    return null;
  }
}

type Draft = { text: string; resolved: EvidenceRecord[] };

function resolveToken(token: string, records: EvidenceRecord[], byId: Map<string, EvidenceRecord>) {
  return recordForMarker(token, records, byId);
}

function draftsFromItems(items: unknown[], records: EvidenceRecord[], byId: Map<string, EvidenceRecord>, discarded: string[]) {
  const drafts: Draft[] = [];
  for (const item of items) {
    if (!item || typeof item !== "object") continue;
    const row = item as { texto?: unknown; pmid?: unknown; text?: unknown };
    const text = typeof row.texto === "string" ? row.texto : typeof row.text === "string" ? row.text : "";
    const field = row.pmid == null ? "" : String(row.pmid);
    if (!text.trim()) continue;
    if (field) {
      const record = resolveToken(field, records, byId);
      if (record) {
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

function acceptDraft(draft: Draft, concept?: SearchConcept) {
  const citedText = draft.resolved.map((record) => `${record.title}\n${record.abstract}`).join("\n");
  const citedAbstract = draft.resolved.map((record) => record.abstract || "").join("\n");
  let text = stripInventedCertainty(draft.text, citedAbstract);
  text = attributeSpecificDrug(text, citedAbstract);
  if (!text) return null;
  if (echoesPrompt(text, citedText)) return null;
  if (creditsClassForSingleDrug(text, citedAbstract) || unsupportedYes(text, citedAbstract)) return null;
  text = ensureCertaintyCaveat(text, citedAbstract);
  if (concept && (attributesForeignBenefit(text, citedAbstract, concept) || leavesOutcomeInEnglish(text))) return null;
  return { ...draft, text };
}

export function validateSynthesis(raw: string, records: EvidenceRecord[], concept?: SearchConcept): ClinicalAnswer {
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
  const appearance: string[] = [];
  for (const draft of drafts) {
    const accepted = acceptDraft(draft, concept);
    if (!accepted) continue;
    for (const record of accepted.resolved) {
      if (!appearance.includes(record.pmid)) appearance.push(record.pmid);
    }
    kept.push(accepted);
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
