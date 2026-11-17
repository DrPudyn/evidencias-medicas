import { fetchPubmedAbstract } from "@/lib/pubmed";
import type { AbstractSection } from "@/lib/pubmed-xml";

const cache = new Map<string, { time: number; sections: AbstractSection[]; language?: string }>();
const ABSTRACT_TTL_MS = 4 * 60 * 60 * 1000;

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!/^\d{1,9}$/.test(id)) return Response.json({ error: "PMID inválido." }, { status: 400 });

  const hit = cache.get(id);
  if (hit && Date.now() - hit.time < ABSTRACT_TTL_MS) {
    return Response.json({ sections: hit.sections, language: hit.language, source: "PubMed" });
  }
  try {
    const cached = await (caches as unknown as { default?: Cache }).default?.match(new Request(`https://search-cache.local/abstract/${id}`));
    if (cached) {
      const stored = await cached.json() as { sections: AbstractSection[]; language?: string };
      cache.set(id, { time: Date.now(), sections: stored.sections, language: stored.language });
      return Response.json({ ...stored, source: "PubMed" });
    }
  } catch { /* Memory cache still applies. */ }

  try {
    const { sections, language } = await fetchPubmedAbstract(id);
    cache.set(id, { time: Date.now(), sections, language });
    try {
      await (caches as unknown as { default?: Cache }).default?.put(
        new Request(`https://search-cache.local/abstract/${id}`),
        new Response(JSON.stringify({ sections, language }), { headers: { "Cache-Control": "public, max-age=14400" } }),
      );
    } catch { /* Ignore cache write failures. */ }
    if (cache.size > 200) cache.delete(cache.keys().next().value!);
    return Response.json({ sections, language, source: "PubMed" });
  } catch {
    return Response.json({ error: "Não foi possível carregar o resumo do PubMed agora." }, { status: 502 });
  }
}
