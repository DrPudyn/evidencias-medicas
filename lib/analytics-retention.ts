export async function pruneAnalytics(db: D1Database, now = Date.now()) {
  const cutoff = new Date(now - 180 * 86400000).toISOString().slice(0, 10);
  await db.batch([
    db.prepare("DELETE FROM analytics_visits WHERE day<?").bind(cutoff),
    db.prepare("DELETE FROM analytics_visitor_days WHERE day<?").bind(cutoff),
    db.prepare("DELETE FROM analytics_visitors WHERE last_seen_day<?").bind(cutoff),
    db.prepare("DELETE FROM analytics_daily_counts WHERE day<?").bind(cutoff),
  ]);
}
