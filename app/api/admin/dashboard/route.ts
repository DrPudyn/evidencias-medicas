import { json, settings } from "@/lib/server";
import { requireAdmin } from "@/lib/admin";

function value(row: { n?: number | null } | null | undefined) { return Number(row?.n || 0); }

export async function GET(req: Request) {
  const admin = await requireAdmin(req);
  if (!admin) return json({ error: "Sessão administrativa necessária." }, 401);

  const url = new URL(req.url), days = Math.max(7, Math.min(90, Number(url.searchParams.get("days")) || 30));
  const now = Date.now(), db = settings().DB;
  const from = new Date(now - days * 86400000).toISOString().slice(0, 10);
  const previousFrom = new Date(now - days * 2 * 86400000).toISOString().slice(0, 10);
  const previousVisits = "SELECT COUNT(DISTINCT visitor_hash) AS n FROM analytics_visitor_days WHERE day>=? AND day<?";
  const previousSessions = "SELECT COUNT(*) AS n FROM analytics_visits WHERE day>=? AND day<?";
  const previousEvents = "SELECT COALESCE(SUM(count),0) AS n FROM analytics_daily_counts WHERE day>=? AND day<?";

  const [users, signups, signupsPrevious, bookmarks, bookmarksCurrent, bookmarksPrevious,
    eventTotal, eventPrevious, searches, searchesPrevious, opens, opensPrevious,
    visitors, visitorsPrevious, visits, visitsPrevious, events, services, checks, reviews, audit] = await Promise.all([
    db.prepare("SELECT COUNT(*) AS n FROM users").first(),
    db.prepare("SELECT COUNT(*) AS n FROM users WHERE date(created_at/1000,'unixepoch')>=?").bind(from).first(),
    db.prepare("SELECT COUNT(*) AS n FROM users WHERE date(created_at/1000,'unixepoch')>=? AND date(created_at/1000,'unixepoch')<?").bind(previousFrom, from).first(),
    db.prepare("SELECT COUNT(*) AS n FROM bookmarks").first(),
    db.prepare("SELECT COUNT(*) AS n FROM bookmarks WHERE date(created_at/1000,'unixepoch')>=?").bind(from).first(),
    db.prepare("SELECT COUNT(*) AS n FROM bookmarks WHERE date(created_at/1000,'unixepoch')>=? AND date(created_at/1000,'unixepoch')<?").bind(previousFrom, from).first(),
    db.prepare("SELECT COALESCE(SUM(count),0) AS n FROM analytics_daily_counts WHERE day>=?").bind(from).first(),
    db.prepare(previousEvents).bind(previousFrom, from).first(),
    db.prepare("SELECT COALESCE(SUM(count),0) AS n FROM analytics_daily_counts WHERE day>=? AND event='search'").bind(from).first(),
    db.prepare("SELECT COALESCE(SUM(count),0) AS n FROM analytics_daily_counts WHERE day>=? AND day<? AND event='search'").bind(previousFrom, from).first(),
    db.prepare("SELECT COALESCE(SUM(count),0) AS n FROM analytics_daily_counts WHERE day>=? AND event='article_open'").bind(from).first(),
    db.prepare("SELECT COALESCE(SUM(count),0) AS n FROM analytics_daily_counts WHERE day>=? AND day<? AND event='article_open'").bind(previousFrom, from).first(),
    db.prepare("SELECT COUNT(DISTINCT visitor_hash) AS n FROM analytics_visitor_days WHERE day>=?").bind(from).first(),
    db.prepare(previousVisits).bind(previousFrom, from).first(),
    db.prepare("SELECT COUNT(*) AS n FROM analytics_visits WHERE day>=?").bind(from).first(),
    db.prepare(previousSessions).bind(previousFrom, from).first(),
    db.prepare("SELECT day,event,topic,source,count FROM analytics_daily_counts WHERE day>=? ORDER BY day DESC,event,topic,source").bind(from).all(),
    db.prepare("SELECT day,service,successes,errors,total_duration_ms FROM service_metrics WHERE day>=? ORDER BY day DESC,service").bind(from).all(),
    db.prepare("SELECT url,status_code,result,duration_ms,checked_at FROM catalog_link_checks ORDER BY checked_at DESC").all(),
    db.prepare("SELECT reviewed_at FROM catalog_reviews ORDER BY reviewed_at DESC LIMIT 1").first<{ reviewed_at: number }>(),
    db.prepare("SELECT action,outcome,created_at FROM admin_audit_log ORDER BY created_at DESC LIMIT 50").all(),
  ]);

  return json({
    periodDays: days, from, previousFrom, lastUpdatedAt: new Date().toISOString(),
    totalUsers: value(users), newUsers: value(signups), previousNewUsers: value(signupsPrevious),
    bookmarks: value(bookmarks), periodBookmarks: value(bookmarksCurrent), previousPeriodBookmarks: value(bookmarksPrevious),
    eventsTotal: value(eventTotal), previousEventsTotal: value(eventPrevious),
    searches: value(searches), previousSearches: value(searchesPrevious),
    articleOpens: value(opens), previousArticleOpens: value(opensPrevious),
    consentedVisitors: value(visitors), previousConsentedVisitors: value(visitorsPrevious),
    sessions: value(visits), previousSessions: value(visitsPrevious),
    activeDefinition: "Visitantes únicos com métricas consentidas em pelo menos um dia do período. Não representa todas as contas ativas.",
    events: events.results, services: services.results, catalogChecks: checks.results,
    lastCatalogReview: reviews?.reviewed_at || null, audit: audit.results,
    latencyPercentile: null, latencyNote: "Percentis não instrumentados; somente média agregada por dia e serviço disponível.",
    billing: { configured: false, status: "Sem provedor configurado", revenue: null },
  });
}
