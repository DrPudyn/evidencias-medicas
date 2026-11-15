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

function section(abstract: string, labels: RegExp) {
  const match = abstract.split(/\n+/).find((line) => labels.test(line.trim()));
  if (!match) return "";
  return match.replace(/^[^:]{2,40}:\s*/, "").trim();
}

function sentencesWithNumbers(text: string) {
  return text.split(/(?<=[.!?])\s+/).filter((sentence) => /\d/.test(sentence)).join(" ");
}

/** Portuguese headings filled only with sentences from the abstract. Missing parts stay explicit. */
export function summaryFromAbstract(abstract: string) {
  const text = abstract.trim();
  const objective = section(text, /^(objective|objectives|aim|aims|purpose|background)\b/i);
  const method = section(text, /^(methods?|design|materials)\b/i);
  const results = section(text, /^(results?|findings|main outcomes?)\b/i);
  const conclusion = section(text, /^(conclusions?|interpretation|summary)\b/i);
  const numbered = sentencesWithNumbers(results || text);
  const line = (label: string, value: string) => `${label}: ${value || "Não consta no resumo."}`;
  return [
    line("Objetivo", objective),
    line("Método", method),
    line("Principais resultados", numbered || results),
    line("Conclusão", conclusion),
    "Aplicação prática: Não consta no resumo como recomendação separada. Use só o que a conclusão acima diz.",
  ].join("\n");
}

export function summaryKeepsSourceNumbers(summary: string, abstract: string) {
  const allowed = new Set([...abstract.matchAll(/\d+(?:[.,]\d+)?/g)].map((match) => match[0].replace(",", ".")));
  return [...summary.matchAll(/\d+(?:[.,]\d+)?/g)].every((match) => allowed.has(match[0].replace(",", ".")));
}
