import type { Article } from "@/lib/catalog";
import { settings } from "@/lib/server";
import { HIGH_LEVEL_EVIDENCE_FILTER, displayPublicationType, isHighLevelPublication } from "@/lib/evidence-filter";
import { abstractsByPmid, type StructuredAbstract } from "@/lib/pubmed-xml";

export { HIGH_LEVEL_EVIDENCE_FILTER };

const NCBI_MIN_INTERVAL_MS = 400;
const NCBI_MAX_QUEUE_MS = 10000;
const NCBI_RETRY_DELAY_MS = 800;

type ESearchResponse = { error?: string; esearchresult?: { idlist: string[]; count: string } };
type ESummaryItem = {
  title?: string; fulljournalname?: string; source?: string; pubdate?: string; sortpubdate?: string; epubdate?: string;
  pubtype?: string[]; authors?: Array<{ name: string }>; articleids?: Array<{ idtype: string; value: string }>;
};
type ESummaryResponse = { error?: string; result?: Record<string, ESummaryItem> };

export type PubmedHit = Article & { abstract?: string; publicationTypes?: string[]; sections?: StructuredAbstract[] };

export type PubmedSearchInput = {
  term: string;
  sort: "relevance" | "pub_date";
  page: number;
  retmax: number;
  reldate?: number;
  abstracts?: boolean;
  /** When set, only articles whose efetch PublicationType is review, meta-analysis or guideline. */
  highLevelOnly?: boolean;
};

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
    tool: "BuscaEvidencia",
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

function publicationType(publicationTypes: string[], title = "") {
  return displayPublicationType(publicationTypes, title);
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

export async function queryPubmed(input: PubmedSearchInput): Promise<{ articles: PubmedHit[]; count: number }> {
  const started = Date.now();
  try {
    const page = Math.min(100, Math.max(1, input.page));
    const retmax = Math.min(40, Math.max(1, input.retmax));
    const params: Record<string, string> = {
      term: input.term,
      sort: input.sort,
      retmax: String(retmax),
      retstart: String((page - 1) * retmax),
    };
    if (input.reldate) {
      params.reldate = String(input.reldate);
      params.datetype = "pdat";
    }
    const resultSet = await ncbi("esearch", params) as ESearchResponse;
    if (resultSet.error || !resultSet.esearchresult) throw new Error("Resposta inválida do PubMed");
    const ids = resultSet.esearchresult.idlist || [];
    let articles: PubmedHit[] = [];
    if (ids.length) {
      const summaryPromise = ncbi("esummary", { id: ids.join(",") }) as Promise<ESummaryResponse>;
      const needDetails = Boolean(input.abstracts || input.highLevelOnly);
      const detailPromise = needDetails
        ? eutils("efetch", { id: ids.join(","), retmode: "xml" })
          .then(async (response) => abstractsByPmid(await response.text()))
          .catch(() => ({} as Record<string, { abstract: string; language?: string; publicationTypes: string[]; sections: StructuredAbstract[] }>))
        : Promise.resolve({} as Record<string, { abstract: string; language?: string; publicationTypes: string[]; sections: StructuredAbstract[] }>);
      const [summary, details] = await Promise.all([summaryPromise, detailPromise]);
      if (summary.error || !summary.result) throw new Error("Resposta inválida do PubMed");
      const summaryItems = summary.result;
      articles = ids.map((id) => {
        const item = summaryItems[id];
        if (!item?.title) return null;
        const summaryTypes = item.pubtype || [];
        const publicationTypes = details[id]?.publicationTypes?.length ? details[id].publicationTypes : summaryTypes;
        if (input.highLevelOnly && !isHighLevelPublication(details[id]?.publicationTypes || [])) return null;
        const authors = item.authors || [];
        const hit: PubmedHit = {
          id,
          title: item.title.replace(/<[^>]*>/g, ""),
          journal: item.fulljournalname || item.source || "PubMed",
          date: item.pubdate || item.sortpubdate || item.epubdate || "",
          electronicDate: item.epubdate && item.pubdate && item.epubdate !== item.pubdate ? item.epubdate : undefined,
          authors: (authors.slice(0, 2).map((author) => author.name).join(", ") || "Autores no PubMed") + (authors.length > 2 ? " et al." : ""),
          type: publicationType(publicationTypes, item.title.replace(/<[^>]*>/g, "")),
          publicationTypes,
          topic: "all",
          doi: item.articleids?.find((articleId) => articleId.idtype === "doi")?.value,
          url: `https://pubmed.ncbi.nlm.nih.gov/${id}/`,
          language: details[id]?.language,
          source: "PubMed" as const,
        };
        if (input.abstracts) {
          hit.abstract = details[id]?.abstract || "";
          hit.sections = details[id]?.sections || [];
        }
        return hit;
      }).filter((item): item is PubmedHit => Boolean(item));
    }
    await recordPubmedMetric(true, Date.now() - started);
    return { articles, count: Number(resultSet.esearchresult.count) || 0 };
  } catch (error) {
    await recordPubmedMetric(false, Date.now() - started);
    throw error;
  }
}
