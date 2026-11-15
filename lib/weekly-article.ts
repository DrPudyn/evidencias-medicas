import type { StructuredAbstract } from "./pubmed-xml";

const JOURNALS = /new england journal|lancet|jama\b|bmj\b|circulation|european heart journal|annals of internal medicine|nature medicine|journal of the american college of cardiology/i;

type Candidate = {
  id: string;
  title: string;
  journal: string;
  date?: string;
  url?: string;
  type: string;
  abstract?: string;
  publicationTypes?: string[];
  sections?: StructuredAbstract[];
};

export type WeeklyPick = {
  pmid: string;
  title: string;
  journal: string;
  date: string;
  type: string;
  url: string;
  abstract: string;
  summary: string;
};

export function weekKey(now = new Date()) {
  const parts = new Intl.DateTimeFormat("en-CA", { timeZone: "America/Sao_Paulo", year: "numeric", month: "2-digit", day: "2-digit" }).format(now).split("-").map(Number);
  const utc = new Date(Date.UTC(parts[0], parts[1] - 1, parts[2]));
  const weekday = utc.getUTCDay() || 7;
  utc.setUTCDate(utc.getUTCDate() - weekday + 1);
  return utc.toISOString().slice(0, 10);
}

function rank(article: Candidate) {
  const type = `${article.type} ${(article.publicationTypes || []).join(" ")}`.toLowerCase();
  if (/guideline|diretriz/.test(type)) return 0;
  if (/systematic|sistemática|sistematica/.test(type)) return 1;
  if (/meta/.test(type)) return 2;
  if (/random|ensaio/.test(type)) return 3;
  return 4;
}

/** One article for the specialty-week: high-level or a large trial, with an abstract, stable by PMID. */
export function pickWeeklyArticle(articles: Candidate[]) {
  const usable = articles.filter((article) => (article.abstract || "").trim().length > 80 && article.title && article.id);
  usable.sort((a, b) => rank(a) - rank(b) || Number(JOURNALS.test(b.journal)) - Number(JOURNALS.test(a.journal)) || Number(b.id) - Number(a.id));
  return usable[0] || null;
}

export type WeeklyParts = {
  objective: string;
  method: string;
  results: string;
  conclusion: string;
};

export const PRACTICE_FALLBACK = "Não consta no resumo como recomendação separada. Use só o que a conclusão acima diz.";

export const WEEKLY_SECTION_PROMPT = "Traduza o trecho para português, fiel ao original. Não acrescente, omita ou mude números, percentuais ou intervalos. Não transforme conclusão em recomendação. Na primeira menção, escreva por extenso uma sigla somente se o próprio trecho a definir. Não invente o significado: se o original não define a sigla, mantenha o termo em inglês por extenso quando ele já aparece, ou a sigla original. Não crie sigla nova. Exemplo: TCC só pode virar Tai Chi Chuan se o trecho definir isso; não leia TCC como terapia cognitivo-comportamental.";

const DROP_LABEL = /^(funding|registration|systematic review registration|copyright|conflict of interest)$/i;
const RESULT_LABEL = /^(results|findings|main results|main outcomes?|synthesis of results|outcomes)$/i;
const CONCLUSION_LABEL = /^(authors' conclusions|conclusions?|interpretation)$/i;
const METHOD_LABEL = /^(methods?|search methods|materials and methods|design|data|sources|data sources|study selection|eligibility criteria|synthesis methods|included studies|materials|risk of bias)$/i;
const OBJECTIVE_LABEL = /^(objectives?|aims?|purpose)$/i;
const BACKGROUND_LABEL = /^(background|rationale|introduction)$/i;

function emptyParts(): WeeklyParts {
  return { objective: "", method: "", results: "", conclusion: "" };
}

function append(parts: WeeklyParts, key: keyof WeeklyParts, value: string) {
  const text = value.trim();
  if (!text) return;
  parts[key] = parts[key] ? `${parts[key]} ${text}` : text;
}

function sentencesOf(text: string) {
  return text.split(/(?<=[.!?])\s+/).map((sentence) => sentence.trim()).filter(Boolean);
}

const CJK = /[\u3400-\u9fff\u3040-\u30ff\uac00-\ud7af]/;

function latinOnly(text: string) {
  const chars = [...text];
  const cjk = chars.filter((char) => CJK.test(char)).length;
  const latin = chars.filter((char) => /[A-Za-z\u00C0-\u024F]/.test(char)).length;
  if (cjk > 0 && cjk >= latin) return "";
  if (!cjk) return text.replace(/\s+/g, " ").trim();
  return chars.filter((char) => !CJK.test(char)).join("").replace(/\s+/g, " ").trim();
}

function sectionKey(label: string, nlmCategory: string): keyof WeeklyParts | "" {
  const name = label.toLowerCase().replace(/[’]/g, "'").replace(/\s+/g, " ").trim();
  const category = nlmCategory.toUpperCase();
  if (DROP_LABEL.test(name)) return "";
  if (RESULT_LABEL.test(name) || category === "RESULTS") return "results";
  if (CONCLUSION_LABEL.test(name) || category === "CONCLUSIONS") return "conclusion";
  if (METHOD_LABEL.test(name) || category === "METHODS") return "method";
  if (OBJECTIVE_LABEL.test(name) || category === "OBJECTIVE") return "objective";
  if (BACKGROUND_LABEL.test(name) || category === "BACKGROUND") return "objective";
  return "";
}

function splitStudySelection(text: string) {
  const sentences = sentencesOf(text);
  const cut = sentences.findIndex((sentence) => /\b(included|screened)\b/i.test(sentence));
  if (cut < 0 || cut >= sentences.length - 1) return { method: text.trim(), results: "" };
  return { method: sentences.slice(0, cut + 1).join(" "), results: sentences.slice(cut + 1).join(" ") };
}

function unstructured(text: string): WeeklyParts {
  const parts = emptyParts();
  const sentences = sentencesOf(text);
  if (!sentences.length) return parts;
  const methodish = (sentence: string) => /\b(delphi|searched|databases|prisma|eligibility|risk of bias|randomized controlled)\b/i.test(sentence);
  const finding = (sentence: string) => /\d/.test(sentence) && !methodish(sentence);
  const last = sentences[sentences.length - 1];
  const conclusion = methodish(last) ? "" : last;
  const body = conclusion ? sentences.slice(0, -1) : sentences;
  parts.method = body.filter(methodish).join(" ");
  parts.results = body.filter((sentence) => finding(sentence)).join(" ");
  parts.objective = body.filter((sentence) => !methodish(sentence) && !finding(sentence)).join(" ");
  parts.conclusion = conclusion;
  return parts;
}

/** Maps AbstractText blocks by NlmCategory. Label is used when the category is missing or UNASSIGNED. */
export function weeklyParts(blocks: StructuredAbstract[]): WeeklyParts {
  const cleaned = blocks
    .map((block) => ({ ...block, text: latinOnly(block.text) }))
    .filter((block) => block.text);
  const keyed = cleaned.map((block) => ({ ...block, key: sectionKey(block.label, block.nlmCategory) }));
  if (!keyed.length || keyed.every((block) => !block.key)) return unstructured(keyed.map((block) => block.text).join(" "));
  const parts = emptyParts();
  for (const block of keyed) {
    if (!block.key) continue;
    if (block.key === "method" && /study selection/i.test(block.label)) {
      const split = splitStudySelection(block.text);
      append(parts, "method", split.method);
      append(parts, "results", split.results);
      continue;
    }
    append(parts, block.key, block.text);
  }
  return parts;
}

export function explicitRecommendation(parts: WeeklyParts) {
  return sentencesOf([parts.objective, parts.method, parts.results, parts.conclusion].join(" "))
    .find((sentence) => /\b(we recommend|the authors recommend|is recommended|are recommended)\b/i.test(sentence))
    ?.trim() || "";
}

export type WeeklyTranslation = Partial<WeeklyParts & { recommendation: string }>;

export function acceptSectionTranslation(source: string, translated: string) {
  const text = translated.replace(/\s+/g, " ").trim();
  if (!text || !sameNumberList(text, source)) return false;
  const sourceRecommends = /\brecommend\b|\bshould\b/i.test(source);
  if (!sourceRecommends && /recomend/i.test(text)) return false;
  return true;
}

export function sectionsToTranslate(parts: WeeklyParts) {
  const sections: { key: keyof WeeklyTranslation; text: string }[] = [
    { key: "objective", text: parts.objective },
    { key: "method", text: parts.method },
    { key: "results", text: parts.results },
    { key: "conclusion", text: parts.conclusion },
  ];
  const recommendation = explicitRecommendation(parts);
  if (recommendation) sections.push({ key: "recommendation", text: recommendation });
  return sections.filter((section) => section.text.trim());
}

export function renderWeeklySummary(parts: WeeklyParts, translated: WeeklyTranslation = {}) {
  const line = (label: string, key: keyof WeeklyParts) => {
    const source = parts[key].trim();
    if (!source) return `${label}: Não consta no resumo.`;
    const candidate = translated[key]?.trim();
    const text = candidate && acceptSectionTranslation(source, candidate) ? candidate : source;
    return `${label}: ${text}`;
  };
  const recommendation = explicitRecommendation(parts);
  const practice = recommendation
    ? (translated.recommendation && acceptSectionTranslation(recommendation, translated.recommendation) ? translated.recommendation.trim() : recommendation)
    : PRACTICE_FALLBACK;
  return [
    line("Objetivo", "objective"),
    line("Método", "method"),
    line("Principais resultados", "results"),
    line("Conclusão", "conclusion"),
    `Aplicação prática: ${practice}`,
  ].join("\n");
}

const PLAIN_HEADER = /\b(authors'\s+conclusions|search\s+methods|materials\s+and\s+methods|main\s+results|main\s+outcomes?|data\s+sources|study\s+selection|objectives?|aims?|purpose|background|introduction|methods?|design|results?|findings|conclusions?|interpretation)\s*:/gi;

function partsFromPlain(abstract: string): WeeklyParts {
  const text = abstract.replace(/^resumo:\s*/i, "").replace(/\s+/g, " ").trim();
  const marks = [...text.matchAll(PLAIN_HEADER)];
  if (!marks.length) return unstructured(text);
  const blocks: StructuredAbstract[] = marks.map((mark, index) => {
    const start = (mark.index ?? 0) + mark[0].length;
    const end = index + 1 < marks.length ? marks[index + 1].index ?? text.length : text.length;
    return { label: mark[1] || "", nlmCategory: "", text: text.slice(start, end).trim() };
  });
  return weeklyParts(blocks);
}

/** Portuguese headings filled only from the abstract. The practice line is fixed unless the abstract recommends. */
export function summaryFromAbstract(abstract: string) {
  return renderWeeklySummary(partsFromPlain(abstract));
}

export function weeklySpecialtyQuery(specialty: string, terms: string) {
  if (specialty === "family-medicine") {
    return '"Family Practice"[MeSH Terms] OR "Primary Health Care"[MeSH Terms] OR "family medicine"[Title/Abstract] OR "general practice"[Title/Abstract] OR "primary care"[Title/Abstract]';
  }
  if (specialty === "cardiology") return '"Cardiovascular Diseases"[MeSH Terms] OR cardiology[Title/Abstract]';
  if (specialty === "endocrinology") return '"Endocrine System Diseases"[MeSH Terms] OR endocrinology[Title/Abstract]';
  const pieces = terms.split(";").map((term) => `"${term.trim()}"[Title/Abstract]`).filter((term) => term !== "\"\"[Title/Abstract]");
  return pieces.join(" OR ") || `"${specialty}"[Title/Abstract]`;
}

export const WEEKLY_WINDOWS = [28, 90, 180];

export function sameNumberList(left: string, right: string) {
  const pull = (text: string) => [...text.matchAll(/\d+(?:[.,]\d+)?%?/g)].map((match) => match[0].replace(",", ".")).sort();
  const a = pull(left);
  const b = pull(right);
  return a.length === b.length && a.every((item, index) => item === b[index]);
}

export function summaryKeepsSourceNumbers(summary: string, abstract: string) {
  const allowed = new Set([...abstract.matchAll(/\d+(?:[.,]\d+)?/g)].map((match) => match[0].replace(",", ".")));
  return [...summary.matchAll(/\d+(?:[.,]\d+)?/g)].every((match) => allowed.has(match[0].replace(",", ".")));
}
