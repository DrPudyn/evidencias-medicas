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

export function abstractPlainText(xml: string, max = 8000) {
  const text = extractSections(xml).map((section) => `${section.label}: ${section.text}`).join("\n");
  return text.slice(0, max);
}

const CONCLUSION_LABEL = /^(conclusions?|interpretation|summary|implicat|conclus)/i;
const RESULTS_LABEL = /^(results?|findings|resultados|main outcome)/i;

function labeledSections(text: string) {
  const sections: { label: string; text: string }[] = [];
  for (const line of text.split(/\n+/)) {
    const match = line.match(/^([^:]{2,40}):\s*([\s\S]+)$/);
    if (!match) continue;
    sections.push({ label: match[1].trim(), text: match[2].trim() });
  }
  return sections;
}

function readableTail(text: string, max: number) {
  if (text.length <= max) return text.trim();
  let tail = text.slice(text.length - max);
  const boundary = tail.search(/(?<=[.!?])\s+/);
  if (boundary >= 0 && boundary < tail.length / 2) tail = tail.slice(boundary).trim();
  if (!/placebo|compared with control|\bversus control\b/i.test(tail)) {
    const prior = text.split(/(?<=[.!?])\s+/).find((sentence) => /placebo|compared with control|\bversus control\b/i.test(sentence) && /reduc|lower|metformin/i.test(sentence));
    if (prior) {
      const joined = `${prior.trim()} ${tail}`.trim();
      tail = joined.length <= max ? joined : prior.trim();
    }
  }
  return tail.trim();
}

/** Keeps conclusions, then results. Unstructured text keeps the ending, where the conclusion usually sits. */
export function focusAbstract(text: string, max = 1800) {
  const clean = text.replace(/\s+\n/g, "\n").trim();
  if (!clean) return "";
  const sections = labeledSections(clean);
  const conclusions = sections.filter((section) => CONCLUSION_LABEL.test(section.label));
  const results = sections.filter((section) => RESULTS_LABEL.test(section.label) && !CONCLUSION_LABEL.test(section.label));
  const picked = [...conclusions, ...results];
  if (picked.length) {
    let excerpt = "";
    for (const section of picked) {
      const piece = `${section.label}: ${section.text}`;
      const clipped = piece.length > max ? readableTail(piece, max) : piece;
      if (!excerpt) {
        excerpt = clipped;
        continue;
      }
      if (excerpt.length + clipped.length + 1 > max) break;
      excerpt = `${excerpt}\n${clipped}`;
    }
    return excerpt.trim();
  }
  if (clean.length <= max) return clean;
  return readableTail(clean, max);
}

/** Conclusion section, or the last sentences when the abstract has no label. */
export function conclusionText(text: string) {
  const sections = labeledSections(text || "");
  const conclusions = sections.filter((section) => CONCLUSION_LABEL.test(section.label));
  if (conclusions.length) return conclusions.map((section) => section.text).join(" ");
  const sentences = (text || "").split(/(?<=[.!?])\s+/).map((sentence) => sentence.trim()).filter(Boolean);
  return sentences.slice(-2).join(" ");
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
