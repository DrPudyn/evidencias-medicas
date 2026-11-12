import type { ClinicalAnswer, ClinicalReference, EvidenceRecord } from "./types";
import type { SearchConcept } from "./terms";
import { conceptNeedles } from "./select";
import { CLINICAL_DISCLAIMER } from "./types";

const ANSWER_MAX = 2200;

export function toReference(record: EvidenceRecord, n: number): ClinicalReference {
  return {
    n,
    pmid: record.pmid,
    title: record.title,
    url: `https://pubmed.ncbi.nlm.nih.gov/${record.pmid}/`,
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

/** [n] is the number printed on the article we sent. A longer number is a PMID. */
export function recordForMarker(raw: string, records: EvidenceRecord[], byId: Map<string, EvidenceRecord>) {
  const digits = raw.replace(/\D/g, "");
  if (!digits) return null;
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
  for (const match of unit.matchAll(/\[(\d{1,9})\]/g)) found.push(match[1]);
  for (const match of unit.matchAll(/\bPMID[:\s]*(\d{1,9})\b/gi)) found.push(match[1]);
  return found;
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
];

const OTHER_DRUGS = ["semaglutide", "liraglutide", "dulaglutide", "tirzepatide", "exenatide", "insulin", "sitagliptin"];

function outcomeHits(line: string) {
  const folded = fold(line);
  return OUTCOME_PAIRS.filter(([english, portuguese]) => folded.includes(portuguese) || folded.includes(english));
}

function sentenceHasClass(sentence: string, needles: string[]) {
  const folded = fold(sentence);
  return needles.some((needle) => folded.includes(needle));
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

export function omitsLowCertainty(line: string, excerpt: string) {
  const sentences = excerpt.split(/(?<=[.!?])\s+/);
  const low = sentences.some((sentence) => /very low certainty|low certainty|low-certainty/.test(sentence.toLowerCase()));
  if (!low) return false;
  return !/baixa|incerta/.test(fold(line));
}

export function leavesOutcomeInEnglish(line: string) {
  const english = /\b(hospitalization for heart failure|sglt2 inhibitors|sodium-glucose transporter)\b/i.test(line);
  const portuguese = /hospitalizaç|hospitalizacao\b|insufici[eê]ncia|inibidores? de sglt2/i.test(line);
  return english && !portuguese;
}

export function validateSynthesis(raw: string, records: EvidenceRecord[], concept?: SearchConcept): ClinicalAnswer {
  const byId = new Map(records.map((record) => [record.pmid, record]));
  let parsed: Record<string, unknown> | null = null;
  try {
    const trimmed = raw.trim().replace(/^```(?:json)?/i, "").replace(/```$/i, "").trim();
    const start = trimmed.indexOf("{");
    const end = trimmed.lastIndexOf("}");
    parsed = start >= 0 && end > start ? JSON.parse(trimmed.slice(start, end + 1)) as Record<string, unknown> : null;
  } catch {
    parsed = null;
  }
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
  const source = typeof parsed.answer === "string" ? parsed.answer.trim() : "";
  const kept: string[] = [];
  const appearance: string[] = [];
  for (const unit of splitUnits(source)) {
    const markers = markersOf(unit);
    if (!markers.length) continue;
    const resolved: EvidenceRecord[] = [];
    let invalid = false;
    for (const marker of markers) {
      const record = recordForMarker(marker, records, byId);
      if (!record) {
        invalid = true;
        if (/^\d{5,9}$/.test(marker)) discarded.push(marker);
        else discarded.push(marker);
        break;
      }
      if (!resolved.some((item) => item.pmid === record.pmid)) resolved.push(record);
    }
    if (invalid || !resolved.length) continue;
    const citedText = resolved.map((record) => `${record.title}\n${record.abstract}`).join("\n");
    const citedAbstract = resolved.map((record) => record.abstract || "").join("\n");
    if (echoesPrompt(unit, citedText)) continue;
    if (concept && (attributesForeignBenefit(unit, citedAbstract, concept) || omitsLowCertainty(unit, citedAbstract) || leavesOutcomeInEnglish(unit))) continue;
    for (const record of resolved) {
      if (!appearance.includes(record.pmid)) appearance.push(record.pmid);
    }
    kept.push(unit);
  }
  if (!kept.length || !appearance.length) {
    return insufficientAnswer(
      "A busca recuperou registros, mas não houve afirmação que pudesse ser ligada somente a esses artigos. Nenhuma conclusão foi produzida.",
      discarded,
    );
  }
  const display = new Map(appearance.map((pmid, index) => [pmid, index + 1]));
  const answer = tidy(kept.map((unit) => unit
    .replace(/\[(\d{1,9})\]/g, (_token, raw: string) => {
      const record = recordForMarker(raw, records, byId);
      return record ? `[${display.get(record.pmid)}]` : "";
    })
    .replace(/\bPMID[:\s]*(\d{1,9})\b/gi, (_token, raw: string) => {
      const record = byId.get(raw);
      return record ? `[${display.get(record.pmid)}]` : "";
    })).join("\n")).slice(0, ANSWER_MAX);
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
