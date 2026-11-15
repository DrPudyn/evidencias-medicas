import { searchArticles } from "@/lib/article-search";

export async function GET(req: Request) {
  const result = await searchArticles(new URL(req.url).searchParams, req);
  if (result.error) return Response.json({ error: result.error }, { status: result.error.startsWith("Muitas") ? 429 : 502, headers: { "Cache-Control": "no-store" } });
  return Response.json({ articles: result.articles, count: result.count, page: result.page, source: "PubMed", fetchedAt: new Date().toISOString() }, { headers: { "Cache-Control": "no-store" } });
}
