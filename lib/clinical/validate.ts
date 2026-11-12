import type { ClinicalAnswer, ClinicalReference, EvidenceRecord } from "./types";
import { CLINICAL_DISCLAIMER } from "./types";

const ANSWER_MAX = 1400;

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

function pmidOf(value: unknown) {
  const pmid = String(value ?? "").replace(/\D/g, "");
  return /^\d{1,9}$/.test(pmid) ? pmid : "";
}

function tidy(text: string) {
  return text
    .replace(/PMID[:\s]*\d{1,9}/gi, "")
    .replace(/\s+([,.;:!?])/g, "$1")
    .replace(/\(\s*\)/g, "")
    .replace(/\s{2,}/g, " ")
    .trim();
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

  const listed = Array.isArray(parsed.citations) ? parsed.citations : [];
  const discarded: string[] = [];
  const cited: EvidenceRecord[] = [];
  const indexMap = new Map<number, number>();
  listed.forEach((item, index) => {
    const pmid = pmidOf(item);
    if (!pmid || !byId.has(pmid)) {
      if (pmid) discarded.push(pmid);
      return;
    }
    let position = cited.findIndex((record) => record.pmid === pmid);
    if (position < 0) {
      cited.push(byId.get(pmid)!);
      position = cited.length - 1;
    }
    indexMap.set(index + 1, position + 1);
  });

  const source = typeof parsed.answer === "string" ? parsed.answer.trim() : "";
  const allowed = new Set(cited.map((record) => record.pmid));
  for (const match of source.matchAll(/PMID[:\s]*(\d{1,9})/gi)) {
    if (!allowed.has(match[1])) discarded.push(match[1]);
  }
  const sentences = source.split(/(?<=[.!?])\s+/).map((sentence) => sentence.trim()).filter(Boolean);
  const keptSentences = sentences.filter((sentence) => {
    const mentioned = [...sentence.matchAll(/PMID[:\s]*(\d{1,9})/gi)].map((match) => match[1]);
    if (mentioned.some((pmid) => !allowed.has(pmid))) return false;
    const marks = [...sentence.matchAll(/\[(\d{1,2})\]/g)].map((match) => Number(match[1]));
    return marks.some((mark) => indexMap.has(mark));
  });
  let text = tidy(keptSentences.join(" ").replace(/\[(\d{1,2})\]/g, (token, raw) => {
    const next = indexMap.get(Number(raw));
    return next ? `[${next}]` : "";
  }));
  const used = new Set([...text.matchAll(/\[(\d{1,2})\]/g)].map((match) => Number(match[1])));
  const kept = cited.filter((_, index) => used.has(index + 1));
  if (!kept.length) {
    return insufficientAnswer(
      "A busca recuperou registros, mas não houve afirmação que pudesse ser ligada somente a esses artigos. Nenhuma conclusão foi produzida.",
      discarded,
    );
  }
  const finalNumber = new Map<number, number>();
  kept.forEach((record, index) => {
    finalNumber.set(cited.findIndex((item) => item.pmid === record.pmid) + 1, index + 1);
  });
  text = tidy(text.replace(/\[(\d{1,2})\]/g, (token, raw) => {
    const next = finalNumber.get(Number(raw));
    return next ? `[${next}]` : "";
  })).slice(0, ANSWER_MAX);
  if (!/\[[1-9]\d?\]/.test(text)) {
    return insufficientAnswer(
      "A busca recuperou registros, mas não houve afirmação que pudesse ser ligada somente a esses artigos. Nenhuma conclusão foi produzida.",
      discarded,
    );
  }
  return {
    sufficient: true,
    answer: text,
    references: kept.map((record, index) => toReference(record, index + 1)),
    discardedCitations: [...new Set(discarded)],
    disclaimer: CLINICAL_DISCLAIMER,
  };
}
