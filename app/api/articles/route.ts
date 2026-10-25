import { buildPubmedClinicalTerm, medicalSpecialties, specialtyTopicSets, type Article } from "@/lib/catalog";
import { digest, rateLimit, settings } from "@/lib/server";

const cache = new Map<string, { time: number; data: unknown }>();
const types: Record<string, string> = {
  trial: '"Clinical Trial"[Publication Type]',
  rct: '"Randomized Controlled Trial"[Publication Type]',
  review: '"Review"[Publication Type]',
  systematic: 'systematic[sb]',
  meta: '"Meta-Analysis"[Publication Type]',
  guideline: '"Practice Guideline"[Publication Type]',
};
// Leave headroom below NCBI's unauthenticated three-requests-per-second limit.
const NCBI_MIN_INTERVAL_MS = 400;
const NCBI_MAX_QUEUE_MS = 10000;
const NCBI_RETRY_DELAY_MS = 800;
type ESearchResponse = { error?: string; esearchresult?: { idlist: string[]; count: string } };
type ESummaryItem = {
  title?: string; fulljournalname?: string; source?: string; pubdate?: string; sortpubdate?: string; epubdate?: string;
  pubtype?: string[]; authors?: Array<{ name: string }>; articleids?: Array<{ idtype: string; value: string }>;
};
type ESummaryResponse = { error?: string; result?: Record<string, ESummaryItem> };

async function reserveNcbiSlot() {
  const now = Date.now();
  const row = await settings().DB.prepare(
    "INSERT INTO integration_rate_slots(service,next_at) VALUES('pubmed',?) ON CONFLICT(service) DO UPDATE SET next_at=MAX(integration_rate_slots.next_at+?,excluded.next_at) WHERE integration_rate_slots.next_at<excluded.next_at+? RETURNING next_at",
  ).bind(now, NCBI_MIN_INTERVAL_MS, NCBI_MAX_QUEUE_MS).first<{ next_at: number }>();
  if (!row) throw new Error("PubMed está ocupado; tente novamente em instantes.");
  const delay = row.next_at - Date.now();
  if (delay > 0) await new Promise((resolve) => setTimeout(resolve, delay));
}

async function eutils(endpoint: string, params: Record<string, string>) {
  const config = settings();
  const url = new URL(`https://eutils.ncbi.nlm.nih.gov/entrez/eutils/${endpoint}.fcgi`);
  url.search = new URLSearchParams({
    db: "pubmed",
    tool: "EvidenciasMedicas",
    ...(config.NCBI_CONTACT_EMAIL ? { email: config.NCBI_CONTACT_EMAIL } : {}),
    ...(config.NCBI_API_KEY ? { api_key: config.NCBI_API_KEY } : {}),
    ...params,
  }).toString();
  for (let attempt = 0; attempt < 2; attempt++) {
    await reserveNcbiSlot();
    let response: Response;
    try {
      response = await fetch(url, { signal: AbortSignal.timeout(15000) });
    } catch (error) {
      if (attempt === 0) {
        await new Promise((resolve) => setTimeout(resolve, NCBI_RETRY_DELAY_MS));
        continue;
      }
      throw error;
    }
    if (response.ok) return response;
    const retryable = response.status === 408 || response.status === 429 || response.status >= 500;
    if (attempt === 0 && retryable) {
      const retryAfter = Number(response.headers.get("Retry-After"));
      await response.body?.cancel();
      await new Promise((resolve) => setTimeout(resolve,
        Number.isFinite(retryAfter) && retryAfter > 0
          ? Math.min(retryAfter * 1000, 2000)
          : NCBI_RETRY_DELAY_MS,
      ));
      continue;
    }
    throw new Error("PubMed indisponível");
  }
  throw new Error("PubMed indisponível");
}

async function ncbi(endpoint: string, params: Record<string, string>): Promise<unknown> {
  const response = await eutils(endpoint, { retmode: "json", ...params });
  return response.json();
}

async function fetchLanguages(ids: string[]): Promise<Record<string, string>> {
  if (!ids.length) return {};
  try {
    const response = await eutils("efetch", { id: ids.join(","), retmode: "xml" });
    const xml = await response.text();
    const result: Record<string, string> = {};
    for (const match of xml.matchAll(/<PubmedArticle>([\s\S]*?)<\/PubmedArticle>/gi)) {
      const id = match[1].match(/<PMID[^>]*>([^<]+)<\/PMID>/i)?.[1];
      const language = match[1].match(/<Language>([^<]+)<\/Language>/i)?.[1]?.trim().toLowerCase();
      if (id && language) result[id] = language;
    }
    return result;
  } catch {
    return {};
  }
}

async function recordPubmedMetric(ok: boolean, duration: number) {
  try {
    const day = new Date().toISOString().slice(0, 10);
    await settings().DB.prepare(
      "INSERT INTO service_metrics(day,service,successes,errors,total_duration_ms) VALUES(?,'pubmed',?,?,?) ON CONFLICT(day,service) DO UPDATE SET successes=successes+excluded.successes,errors=errors+excluded.errors,total_duration_ms=total_duration_ms+excluded.total_duration_ms",
    ).bind(day, ok ? 1 : 0, ok ? 0 : 1, duration).run();
  } catch {
    // Metrics storage must not turn a successful PubMed response into a failed search.
  }
}

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
  const params = {
    term: terms.join(" AND "), sort, retmax: "12", retstart: String((page - 1) * 12),
    ...(days ? { reldate: String(days), datetype: "pdat" } : {}),
  };
  const key = await digest(JSON.stringify(params)), hit = cache.get(key);
  if (hit && Date.now() - hit.time < 300000) return Response.json(hit.data, { headers: { "Cache-Control": "no-store" } });
  if (!await rateLimit(req, "pubmed-search", 120)) {
    return Response.json({ error: "Muitas buscas em pouco tempo. Aguarde antes de consultar novamente." }, { status: 429, headers: { "Retry-After": "3600" } });
  }

  const started = Date.now();
  try {
    const resultSet = await ncbi("esearch", params) as ESearchResponse;
    if (resultSet.error || !resultSet.esearchresult) throw new Error("Resposta inválida do PubMed");
    const ids: string[] = resultSet.esearchresult.idlist;
    let articles: Article[] = [];
    if (ids.length) {
      const [summary, languages] = await Promise.all([
        ncbi("esummary", { id: ids.join(",") }) as Promise<ESummaryResponse>,
        fetchLanguages(ids),
      ]);
      if (summary.error || !summary.result) throw new Error("Resposta inválida do PubMed");
      const summaryItems = summary.result;
      articles = ids.map((id) => {
        const item = summaryItems[id];
        if (!item?.title) return null;
        const publicationTypes = item.pubtype || [];
        const authors = item.authors || [];
        return {
          id,
          title: item.title.replace(/<[^>]*>/g, ""),
          journal: item.fulljournalname || item.source || "PubMed",
          date: item.pubdate || item.sortpubdate || item.epubdate || "",
          electronicDate: item.epubdate && item.pubdate && item.epubdate !== item.pubdate ? item.epubdate : undefined,
          authors: (authors.slice(0, 2).map((author) => author.name).join(", ") || "Autores no PubMed") + (authors.length > 2 ? " et al." : ""),
          type: publicationTypes.includes("Meta-Analysis") ? "Meta-análise"
            : publicationTypes.includes("Systematic Review") ? "Revisão sistemática"
              : publicationTypes.includes("Randomized Controlled Trial") ? "Ensaio clínico randomizado"
                : publicationTypes.includes("Clinical Trial") ? "Ensaio clínico"
                  : publicationTypes.includes("Review") ? "Revisão"
                    : publicationTypes.includes("Practice Guideline") ? "Diretriz" : "Artigo científico",
          topic: topic?.[0] || "all",
          doi: item.articleids?.find((articleId) => articleId.idtype === "doi")?.value,
          url: `https://pubmed.ncbi.nlm.nih.gov/${id}/`,
          language: languages[id],
          source: "PubMed" as const,
        };
      }).filter((item): item is NonNullable<typeof item> => Boolean(item));
    }
    const data = { articles, count: Number(resultSet.esearchresult.count), page, source: "PubMed", fetchedAt: new Date().toISOString() };
    if (cache.size >= 100) cache.delete(cache.keys().next().value!);
    cache.set(key, { time: Date.now(), data });
    await recordPubmedMetric(true, Date.now() - started);
    return Response.json(data, { headers: { "Cache-Control": "no-store" } });
  } catch {
    await recordPubmedMetric(false, Date.now() - started);
    return Response.json({ error: "Não foi possível consultar o PubMed agora. Tente novamente ou explore a coleção inicial de estudos." }, { status: 502 });
  }
}
