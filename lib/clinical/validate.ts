import type { ClinicalAnswer, ClinicalReference, EvidenceLevel, EvidenceRecord } from "./types";
import { CLINICAL_DISCLAIMER } from "./types";

const LEVELS = new Set<EvidenceLevel>(["alto", "moderado", "baixo", "insuficiente"]);

function safeDoi(doi?: string) {
  if (!doi) return undefined;
  const clean = doi.replace(/^https?:\/\/(?:dx\.)?doi\.org\//i, "").trim();
  return /^10\.\d{4,9}\/\S+$/i.test(clean) ? clean : undefined;
}

export function toReference(record: EvidenceRecord): ClinicalReference {
  return {
    pmid: record.pmid,
    title: record.title,
    journal: record.journal,
    date: record.date,
    type: record.type,
    doi: safeDoi(record.doi),
    url: `https://pubmed.ncbi.nlm.nih.gov/${record.pmid}/`,
  };
}

function capLevel(requested: string, records: EvidenceRecord[]): { level: EvidenceLevel; note: string } {
  const hasMeta = records.some((record) => /meta/i.test(record.type));
  const hasReview = records.some((record) => /sistemática|systematic/i.test(record.type));
  const hasGuideline = records.some((record) => /diretriz|guideline/i.test(record.type));
  let level: EvidenceLevel = LEVELS.has(requested as EvidenceLevel) ? requested as EvidenceLevel : "baixo";
  if (level === "insuficiente") level = "baixo";
  let note = "";
  if (level === "alto" && !(hasMeta || hasReview)) {
    level = hasGuideline ? "moderado" : "baixo";
    note = " O nível foi limitado porque esta busca não trouxe metanálise nem revisão sistemática.";
  } else if (level === "moderado" && !(hasMeta || hasReview || hasGuideline)) {
    level = "baixo";
    note = " O nível foi limitado aos tipos de publicação realmente recuperados.";
  }
  return { level, note };
}

export function insufficientAnswer(message: string, records: EvidenceRecord[], discarded: string[] = [], terms: string[] = []): ClinicalAnswer {
  return {
    sufficient: false,
    conclusion: message,
    level: "insuficiente",
    levelReason: "Não há afirmações validadas contra registros recuperados nesta busca.",
    limitations: ["Nenhuma conclusão foi completada com conhecimento fora dos registros recuperados."],
    claims: [],
    references: [],
    retrieved: records.map(toReference),
    discardedCitations: [...new Set(discarded)],
    retrievedCount: records.length,
    searchTerms: terms,
    disclaimer: CLINICAL_DISCLAIMER,
  };
}

export function validateSynthesis(raw: string, records: EvidenceRecord[], terms: string[]): ClinicalAnswer {
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
  if (!parsed) {
    return insufficientAnswer(
      "A síntese não pôde ser validada contra os registros recuperados. Nenhuma conclusão foi produzida.",
      records,
      [],
      terms,
    );
  }
  const discarded: string[] = [];
  const claimsIn = Array.isArray(parsed.claims) ? parsed.claims : [];
  const claims: ClinicalAnswer["claims"] = [];
  for (const claim of claimsIn) {
    if (!claim || typeof claim !== "object") continue;
    const text = typeof (claim as { text?: unknown }).text === "string"
      ? (claim as { text: string }).text.trim().slice(0, 700)
      : "";
    const listed = Array.isArray((claim as { pmids?: unknown }).pmids) ? (claim as { pmids: unknown[] }).pmids : [];
    const valid: string[] = [];
    for (const item of listed) {
      const pmid = String(item).replace(/\D/g, "");
      if (!pmid) continue;
      if (!byId.has(pmid)) discarded.push(pmid);
      else valid.push(pmid);
    }
    for (const match of text.matchAll(/PMID[:\s]*(\d{1,9})/gi)) {
      if (!byId.has(match[1])) discarded.push(match[1]);
    }
    const unique = [...new Set(valid)].filter((id) => byId.has(id));
    if (!text || unique.length === 0) continue;
    claims.push({ text, pmids: unique });
  }
  const citedIds = [...new Set(claims.flatMap((claim) => claim.pmids))];
  const citedRecords = citedIds.map((id) => byId.get(id)!);
  if (!parsed.sufficient || claims.length === 0 || citedRecords.length === 0) {
    return insufficientAnswer(
      records.length
        ? "A busca recuperou registros, mas não houve afirmação que pudesse ser ligada somente a esses PMIDs. Nenhuma conclusão foi produzida."
        : "Não encontramos revisões sistemáticas, metanálises ou diretrizes no PubMed para esta pergunta. Não há conclusão clínica a partir desta busca.",
      records,
      discarded,
      terms,
    );
  }
  let conclusion = typeof parsed.conclusion === "string" ? parsed.conclusion.trim().slice(0, 1400) : "";
  for (const match of conclusion.matchAll(/PMID[:\s]*(\d{1,9})/gi)) {
    if (!byId.has(match[1])) discarded.push(match[1]);
  }
  const conclusionPmids = [...conclusion.matchAll(/PMID[:\s]*(\d{1,9})/gi)].map((match) => match[1]);
  if (!conclusion || conclusionPmids.some((id) => !byId.has(id))) {
    conclusion = claims.map((claim) => claim.text).join(" ");
  }
  const requested = typeof parsed.level === "string" ? parsed.level : "baixo";
  const capped = capLevel(requested, citedRecords);
  const reason = (typeof parsed.levelReason === "string" ? parsed.levelReason.trim().slice(0, 500) : "")
    || "Classificação simplificada a partir dos tipos de publicação citados, não é um GRADE formal.";
  const limitations = Array.isArray(parsed.limitations)
    ? parsed.limitations.filter((item): item is string => typeof item === "string").map((item) => item.trim()).filter(Boolean).slice(0, 6)
    : [];
  limitations.push("A síntese pode parafrasear os resumos. Confira o registro no PubMed antes de qualquer decisão.");
  return {
    sufficient: true,
    conclusion,
    level: capped.level,
    levelReason: `${reason}${capped.note}`.trim(),
    limitations,
    claims,
    references: citedRecords.map(toReference),
    retrieved: records.map(toReference),
    discardedCitations: [...new Set(discarded)],
    retrievedCount: records.length,
    searchTerms: terms,
    disclaimer: CLINICAL_DISCLAIMER,
  };
}
