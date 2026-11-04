export type BrowseSnapshot = {
  query: string; draft: string; specialty: string; topic: string; type: string;
  period: string; guidelineYear: string; free: boolean; sort: string; page: number; tab: string;
};
export const BROWSE_STORAGE_KEY = "em-browse-v1";
export const defaultBrowse: BrowseSnapshot = {
  query: "", draft: "", specialty: "", topic: "all", type: "all", period: "all",
  guidelineYear: "all", free: false, sort: "recent", page: 1, tab: "live",
};

export function sanitizeBrowse(value: unknown): BrowseSnapshot {
  const input = value && typeof value === "object" ? value as Record<string, unknown> : {};
  const text = (key: string, fallback: string, limit: number) => typeof input[key] === "string" ? input[key].slice(0, limit) : fallback;
  const choice = (key: string, choices: string[], fallback: string) => typeof input[key] === "string" && choices.includes(input[key]) ? input[key] : fallback;
  return {
    query: text("query", "", 200), draft: text("draft", text("query", "", 200), 200),
    specialty: text("specialty", "", 80), topic: text("topic", "all", 80), type: text("type", "all", 100),
    period: choice("period", ["all", "30", "365", "1825"], "all"),
    guidelineYear: /^(all|\d{4})$/.test(String(input.guidelineYear)) ? String(input.guidelineYear) : "all",
    free: input.free === true, sort: choice("sort", ["recent", "relevance"], "recent"),
    page: typeof input.page === "number" && Number.isInteger(input.page) && input.page >= 1 && input.page <= 100 ? input.page : 1,
    tab: choice("tab", ["live", "sbc", "collection", "saved"], "live"),
  };
}

export function browseFromLink(url: URL): BrowseSnapshot | null {
  const params = url.searchParams;
  if (params.get("search") !== "1") return null;
  return sanitizeBrowse({ query: params.get("q"), specialty: params.get("specialty"), topic: params.get("topic"),
    type: params.get("type"), period: params.get("period"), guidelineYear: params.get("year"),
    free: params.get("free") === "true", sort: params.get("sort"), page: Number(params.get("page") || 1),
    tab: ["live", "sbc", "collection"].includes(params.get("tab") || "") ? params.get("tab") : "live" });
}

/** Only public search settings enter a shared URL; never reuse the current query string. */
export function searchLink(origin: string, locale: string, value: BrowseSnapshot): string {
  const state = sanitizeBrowse(value);
  const url = new URL(locale === "en" ? "/en" : "/pt", origin);
  url.searchParams.set("search", "1");
  const values = { q: state.query, specialty: state.specialty, topic: state.topic, type: state.type,
    period: state.period, year: state.guidelineYear, free: String(state.free), sort: state.sort,
    page: String(state.page), tab: state.tab === "saved" ? "live" : state.tab };
  for (const [key, value] of Object.entries(values)) url.searchParams.set(key, value);
  url.hash = "explorar";
  return url.toString();
}
