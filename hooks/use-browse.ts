"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import type { Article } from "@/lib/catalog";
import { trackClinicalEvent } from "@/lib/analytics-client";
import { api } from "@/components/cardio/api";
import { guidelineSourceFor } from "@/components/cardio/catalog-query";
import { BROWSE_STORAGE_KEY, browseFromLink, defaultBrowse, sanitizeBrowse, searchLink, type BrowseSnapshot } from "@/lib/browse-state";
import type { AppModal } from "@/components/cardio/types";

export function useBrowse(initial?: BrowseSnapshot & { articles?: Article[]; count?: number; error?: string }) {
  const start = initial ?? defaultBrowse;
  const [ready, setReady] = useState(Boolean(initial?.query || initial?.specialty || initial?.tab === "saved"));
  const [q, setQ] = useState(start.draft || start.query);
  const [query, setQuery] = useState(start.query);
  const [specialty, setSpecialty] = useState(start.specialty);
  const [topic, setTopic] = useState(start.topic);
  const [type, setType] = useState(start.type);
  const [period, setPeriod] = useState(start.period);
  const [guidelineYear, setGuidelineYear] = useState(start.guidelineYear);
  const [free, setFree] = useState(start.free);
  const [sort, setSort] = useState(start.sort);
  const [page, setPage] = useState(start.page);
  const [tab, setTab] = useState(start.tab);
  const [mobileFilters, setMobileFilters] = useState(false);
  const [articles, setArticles] = useState<Article[]>(initial?.articles || []);
  const [count, setCount] = useState(initial?.count || 0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(initial?.error || "");
  const [refresh, setRefresh] = useState(0);
  const [searched, setSearched] = useState(Boolean(initial?.query || initial?.articles?.length));
  const skipServerResults = useRef(Boolean(initial?.articles?.length));
  const userEdited = useRef(false);
  const [modal, setModal] = useState<AppModal>(null);
  const [selected, setSelected] = useState<Article | null>(null);

  // Restore once before fetching, so reload never issues an empty replacement search.
  useEffect(() => {
    let active = true;
    queueMicrotask(() => {
      if (!active) return;
      let restored = browseFromLink(new URL(window.location.href));
      if (!restored) {
        try { restored = sanitizeBrowse(JSON.parse(sessionStorage.getItem(BROWSE_STORAGE_KEY) || "null")); }
        catch { restored = sanitizeBrowse(null); }
      }
      if (userEdited.current) { setReady(true); return; }
      setQ(restored.draft); setQuery(restored.query); setSpecialty(restored.specialty);
      setTopic(restored.topic); setType(restored.type); setPeriod(restored.period);
      setGuidelineYear(restored.guidelineYear); setFree(restored.free); setSort(restored.sort);
      setPage(restored.page); setTab(restored.tab); setReady(true);
    });
    return () => { active = false; };
  }, []);

  useEffect(() => {
    if (!ready) return;
    const snapshot = { query, draft: q, specialty, topic, type, period, guidelineYear, free, sort, page, tab };
    try { sessionStorage.setItem(BROWSE_STORAGE_KEY, JSON.stringify(snapshot)); } catch { /* Storage may be disabled. */ }
    // Keep an explicitly shared URL current without adding search terms to ordinary browsing URLs.
    const current = new URL(window.location.href);
    if (current.searchParams.get("search") === "1" && tab !== "saved") {
      const link = searchLink(current.origin, current.pathname.startsWith("/en") ? "en" : "pt", snapshot);
      if (link !== current.href) window.history.replaceState(window.history.state, "", link);
    }
  }, [ready, q, query, specialty, topic, type, period, guidelineYear, free, sort, page, tab]);

  useEffect(() => {
    if (!ready || tab !== "live" || !searched) return;
    if (skipServerResults.current) {
      skipServerResults.current = false;
      return;
    }
    const controller = new AbortController();
    let active = true;
    queueMicrotask(() => {
      if (!active) return;
      setLoading(true);
      setError("");
    });
    const params = new URLSearchParams({
      q: query,
      topic,
      type,
      period,
      free: String(free),
      sort,
      page: String(page),
      specialty,
    });
    api<{ articles: Article[]; count: number }>(`/api/articles?${params}`, { signal: controller.signal })
      .then((data) => {
        if (!active) return;
        setArticles(data.articles);
        setCount(data.count);
      })
      .catch((failure: { name?: string; message: string }) => {
        if (active && failure.name !== "AbortError") {
          setArticles([]);
          setCount(0);
          setError(failure.message);
        }
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
      controller.abort();
    };
  }, [ready, searched, query, topic, type, period, free, sort, page, tab, refresh, specialty]);

  function reset() {
    setQ("");
    setQuery("");
    setTopic("all");
    setType("all");
    setPeriod("all");
    setGuidelineYear("all");
    setFree(false);
    setPage(1);
  }

  function search(event?: FormEvent) {
    event?.preventDefault();
    trackClinicalEvent("search", topic, tab === "sbc" ? guidelineSourceFor(specialty) : "PubMed");
    setQuery(q);
    setPage(1);
    if (tab === "sbc") return;
    setTab("live");
    setSearched(true);
    setRefresh((value) => value + 1);
  }

  function chooseTopic(value: string) {
    trackClinicalEvent("topic_select", value, tab === "sbc" ? guidelineSourceFor(specialty) : "PubMed");
    setTopic(value);
    if (!specialty) setSpecialty("cardiology");
    setPage(1);
    if (tab === "sbc") return;
    setTab("live");
    setSearched(true);
    setRefresh((current) => current + 1);
  }

  function trackFilter(eventName: string) {
    trackClinicalEvent(eventName, topic, tab === "sbc" ? guidelineSourceFor(specialty) : "PubMed");
  }

  return {
    ready,
    snapshot: { query, draft: q, specialty, topic, type, period, guidelineYear, free, sort, page, tab },
    q,
    setQ,
    query,
    setQuery,
    specialty,
    setSpecialty: (value: string) => { userEdited.current = true; setSpecialty(value); },
    topic,
    setTopic,
    type,
    setType,
    period,
    setPeriod,
    guidelineYear,
    setGuidelineYear,
    free,
    setFree,
    sort,
    setSort,
    page,
    setPage,
    tab,
    setTab,
    mobileFilters,
    setMobileFilters,
    articles,
    count,
    loading,
    error,
    refresh,
    setRefresh,
    modal,
    setModal,
    selected,
    setSelected,
    reset,
    search,
    chooseTopic,
    trackFilter,
  };
}

export type BrowseState = ReturnType<typeof useBrowse>;
