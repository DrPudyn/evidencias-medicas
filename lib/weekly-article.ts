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

const SECTION_LABEL = /(authors'\s+conclusions|search\s+methods|materials\s+and\s+methods|main\s+results|main\s+outcomes?|data\s+sources|study\s+selection|objectives?|aims?|purpose|background|introduction|methods?|design|materials|results?|findings|conclusions?|interpretation)\s*:/gi;

function bucket(label: string) {
  const name = label.toLowerCase().replace(/\s+/g, " ").trim();
  if (/result|finding/.test(name)) return "results";
  if (/conclusion|interpretation/.test(name)) return "conclusion";
  if (/method|design|material|data source|study selection/.test(name)) return "method";
  if (/objective|aim|purpose|background|introduction/.test(name)) return "objective";
  return "";
}

export function abstractSections(abstract: string) {
  const text = abstract.replace(/\s+/g, " ").trim();
  const marks = [...text.matchAll(SECTION_LABEL)];
  const parts = { objective: "", method: "", results: "", conclusion: "" };
  if (!marks.length) {
    const sentences = text.split(/(?<=[.!?])\s+/).map((sentence) => sentence.trim()).filter(Boolean);
    if (!sentences.length) return parts;
    parts.conclusion = sentences.slice(-2).join(" ");
    parts.objective = sentences[0] === parts.conclusion ? "" : sentences[0];
    parts.results = sentences.slice(1, Math.max(1, sentences.length - 2)).join(" ");
    return parts;
  }
  marks.forEach((mark, index) => {
    const key = bucket(mark[1]);
    if (!key) return;
    const start = (mark.index ?? 0) + mark[0].length;
    const end = index + 1 < marks.length ? marks[index + 1].index ?? text.length : text.length;
    const value = text.slice(start, end).trim();
    parts[key] = parts[key] ? `${parts[key]} ${value}` : value;
  });
  return parts;
}

/** Portuguese headings filled only with sentences from the abstract. Missing parts stay explicit. */
export function summaryFromAbstract(abstract: string) {
  const parts = abstractSections(abstract);
  const line = (label: string, value: string) => `${label}: ${value || "Não consta no resumo."}`;
  return [
    line("Objetivo", parts.objective),
    line("Método", parts.method),
    line("Principais resultados", parts.results),
    line("Conclusão", parts.conclusion),
    "Aplicação prática: Não consta no resumo como recomendação separada. Use só o que a conclusão acima diz.",
  ].join("\n");
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
