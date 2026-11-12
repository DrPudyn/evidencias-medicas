import { buildPubmedClinicalTerm, medicalSpecialties, specialtyTopicSets } from "@/lib/catalog";
import { queryPubmed, type PubmedSearchInput } from "@/lib/pubmed";
import { digest, rateLimit } from "@/lib/server";

const cache = new Map<string, { time: number; data: unknown }>();
const types: Record<string, string> = {
  trial: '"Clinical Trial"[Publication Type]',
  rct: '"Randomized Controlled Trial"[Publication Type]',
  review: '"Review"[Publication Type]',
  systematic: "systematic[sb]",
  meta: '"Meta-Analysis"[Publication Type]',
  guideline: '"Practice Guideline"[Publication Type]',
};

export async function GET(req: Request) {
  const search = new URL(req.url).searchParams;
  const raw = (search.get("q") || "").trim().slice(0, 200);
  const requestedSpecialty = search.get("specialty") || "";
  const specialty = medicalSpecialties.some(([id]) => id === requestedSpecialty) ? requestedSpecialty : "";
  const topicId = search.get("topic") || "all";
  const topic = (specialtyTopicSets[specialty] || []).find((item) => item[0] === topicId && item[0] !== "all");
  const clinicalTerm = buildPubmedClinicalTerm(specialty, topicId, raw);
  if (!clinicalTerm) return Response.json({ articles: [], count: 0, page: 1, source: "PubMed", fetchedAt: new Date().toISOString() }, { headers: { "Cache-Control": "no-store" } });
  const terms = [clinicalTerm];
  if (types[search.get("type") || ""]) terms.push(types[search.get("type")!]);
  if (search.get("free") === "true") terms.push("free full text[sb]");

  const periods: Record<string, number> = { "30": 30, "365": 365, "1825": 1825 };
  const days = periods[search.get("period") || ""];
  const page = Math.min(100, Math.max(1, Number(search.get("page")) || 1));
  const sort = search.get("sort") === "relevance" ? "relevance" : "pub_date";
  const today = new Intl.DateTimeFormat("en-CA", { timeZone: "America/Sao_Paulo" }).format(new Date()).replaceAll("-", "/");
  terms.push(`("1900/01/01"[Date - Publication] : "${today}"[Date - Publication])`);
  const params: PubmedSearchInput = { term: terms.join(" AND "), sort: sort === "relevance" ? "relevance" : "pub_date", page, retmax: 12, ...(days ? { reldate: days } : {}) };
  const key = await digest(JSON.stringify(params)), hit = cache.get(key);
  if (hit && Date.now() - hit.time < 300000) return Response.json(hit.data, { headers: { "Cache-Control": "no-store" } });
  if (!await rateLimit(req, "pubmed-search", 120)) {
    return Response.json({ error: "Muitas buscas em pouco tempo. Aguarde antes de consultar novamente." }, { status: 429, headers: { "Retry-After": "3600" } });
  }

  try {
    const result = await queryPubmed(params);
    const articles = result.articles.map((article) => {
    const published = { ...article, topic: topic?.[0] || "all" };
    delete published.publicationTypes;
    delete published.abstract;
    return published;
  });
    const data = { articles, count: result.count, page, source: "PubMed", fetchedAt: new Date().toISOString() };
    if (cache.size >= 100) cache.delete(cache.keys().next().value!);
    cache.set(key, { time: Date.now(), data });
    return Response.json(data, { headers: { "Cache-Control": "no-store" } });
  } catch {
    return Response.json({ error: "Não foi possível consultar o PubMed agora. Tente novamente ou explore a coleção inicial de estudos." }, { status: 502 });
  }
}
