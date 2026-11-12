import type { ClinicalAnswer, ClinicalReference, EvidenceRecord } from "./types";
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

function markersOf(unit: string) {
  const found: string[] = [];
  for (const match of unit.matchAll(/\[(\d{1,9})\]/g)) found.push(match[1]);
  for (const match of unit.matchAll(/\bPMID[:\s]*(\d{1,9})\b/gi)) found.push(match[1]);
  return found;
}

export function validateSynthesis(raw: string, records: EvidenceRecord[]): ClinicalAnswer {
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
