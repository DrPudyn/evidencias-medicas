import { isHighLevelPublication } from "./evidence-filter";

export type AbstractSection = { label: string; text: string };
export type PubmedArticleDetails = { abstract: string; language?: string; publicationTypes: string[] };

export function decodeXml(value: string) {
  return value
    .replace(/<[^>]*>/g, " ")
    .replace(/&#x([\da-f]+);/gi, (_, code: string) => String.fromCodePoint(Number.parseInt(code, 16)))
    .replace(/&#(\d+);/g, (_, code: string) => String.fromCodePoint(Number(code)))
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&amp;/g, "&")
    .replace(/\s+/g, " ")
    .trim();
}

export function extractSections(xml: string): AbstractSection[] {
  return Array.from(xml.matchAll(/<AbstractText\b([^>]*)>([\s\S]*?)<\/AbstractText>/gi), (match) => {
    const label = match[1].match(/\bLabel="([^"]*)"/i)?.[1]
      || match[1].match(/\bNlmCategory="([^"]*)"/i)?.[1]
      || "Resumo";
    return { label: decodeXml(label), text: decodeXml(match[2]) };
  }).filter((section) => section.text.length > 0);
}

export function extractLanguage(xml: string) {
  const language = xml.match(/<Language>([^<]+)<\/Language>/i)?.[1]?.trim().toLowerCase();
  return language || undefined;
}

export function abstractPlainText(xml: string, max = 4000) {
  const text = extractSections(xml).map((section) => `${section.label}: ${section.text}`).join("\n");
  return text.slice(0, max);
}

export function publicationTypesFromArticle(xml: string) {
  return [...xml.matchAll(/<PublicationType\b[^>]*>([^<]*)<\/PublicationType>/gi)]
    .map((match) => decodeXml(match[1]))
    .filter(Boolean);
}

/** Maps PMID to the abstract and PublicationType list from one efetch document. */
export function abstractsByPmid(xml: string): Record<string, PubmedArticleDetails> {
  const result: Record<string, PubmedArticleDetails> = {};
  for (const match of xml.matchAll(/<PubmedArticle>([\s\S]*?)<\/PubmedArticle>/gi)) {
    const id = match[1].match(/<PMID[^>]*>([^<]+)<\/PMID>/i)?.[1]?.trim();
    if (!id) continue;
    result[id] = {
      abstract: abstractPlainText(match[1]),
      language: extractLanguage(match[1]),
      publicationTypes: publicationTypesFromArticle(match[1]),
    };
  }
  return result;
}

export function highLevelPmids(xml: string) {
  return Object.entries(abstractsByPmid(xml))
    .filter(([, detail]) => isHighLevelPublication(detail.publicationTypes))
    .map(([pmid]) => pmid);
}
