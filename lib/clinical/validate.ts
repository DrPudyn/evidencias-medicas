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

type Outcome = { stems: string[]; tokens: string[] };

const OUTCOMES: Outcome[] = [
  { stems: ["hospitali", "hospitalizac"], tokens: [] },
  { stems: ["heart failure", "insuficiencia cardiaca"], tokens: ["ic", "hf", "icfer"] },
  { stems: ["mortalit", "morte"], tokens: [] },
  { stems: ["cardiovascular"], tokens: [] },
  { stems: ["kidney", "renal"], tokens: ["drc"] },
  { stems: ["diabetes", "diabet"], tokens: ["dm2"] },
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

function textHasOutcome(text: string, outcome: Outcome) {
  const folded = fold(text);
  if (outcome.stems.some((stem) => folded.includes(stem))) return true;
  return outcome.tokens.some((token) => new RegExp(`(?:^|[^a-z0-9])${token}(?:[^a-z0-9]|$)`).test(folded));
}

function outcomeHits(line: string) {
  return OUTCOMES.filter((outcome) => textHasOutcome(line, outcome));
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
  const supporting = sentences.filter((sentence) => hits.some((outcome) => textHasOutcome(sentence, outcome)));
  if (!supporting.length) return true;
  return !supporting.some((sentence) => sentenceHasClass(sentence, needles) && !sentenceHasOtherDrug(sentence, needles));
}

const LIMITED_CERTAINTY = /very low[ -]certainty|low[ -]certainty|limited certainty|interpreted cautiously|with caution/i;
const RESULT_LABEL = /^(results?|findings|resultados|data synthesis|conclusions?|interpretation|summary|implicat|conclus|recommendations?)\b/i;

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
      return "Não diga que reduz sem a comparação. Se o estudo comparou doses, escreva comparando doses e a dose, por exemplo 750 mg/dia.";
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
  return !/comparando doses|em comparacao|outras doses|versus/.test(folded);
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
  if (claimOutsideResults(text, citedAbstract) || dropsCombinationQualifier(text, citedAbstract)) return null;
  if (creditsClassForSingleDrug(text, citedAbstract) || unsupportedYes(text, citedAbstract) || unsupportedDoseClaim(text, citedAbstract)) return null;
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
