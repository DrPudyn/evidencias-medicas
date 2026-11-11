import { extractLanguage, extractSections, type AbstractSection } from "@/lib/pubmed-xml";

const cache = new Map<string, { time: number; sections: AbstractSection[]; language?: string }>();

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!/^\d{1,9}$/.test(id)) return Response.json({ error: "PMID inválido." }, { status: 400 });

  const hit = cache.get(id);
  if (hit && Date.now() - hit.time < 30 * 60 * 1000) {
    return Response.json({ sections: hit.sections, language: hit.language, source: "PubMed" });
  }

  try {
    const url = new URL("https://eutils.ncbi.nlm.nih.gov/entrez/eutils/efetch.fcgi");
    url.search = new URLSearchParams({ db: "pubmed", id, retmode: "xml", tool: "BuscaEvidencia" }).toString();
    const response = await fetch(url, { signal: AbortSignal.timeout(15000) });
    if (!response.ok) throw new Error("PubMed unavailable");

    const xml = await response.text();
    const sections = extractSections(xml);
    const language = extractLanguage(xml);
    cache.set(id, { time: Date.now(), sections, language });
    if (cache.size > 200) cache.delete(cache.keys().next().value!);
    return Response.json({ sections, language, source: "PubMed" });
  } catch {
    return Response.json({ error: "Não foi possível carregar o resumo do PubMed agora." }, { status: 502 });
  }
}
