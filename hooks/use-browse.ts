"use client";

import { useEffect, useState, type FormEvent } from "react";
import type { Article } from "@/lib/catalog";
import { trackClinicalEvent } from "@/lib/analytics-client";
import { api } from "@/components/cardio/api";
import { guidelineSourceFor } from "@/components/cardio/catalog-query";
import { scrollToExplore } from "@/components/cardio/scroll";
import type { AppModal } from "@/components/cardio/types";

export function useBrowse() {
  const [q, setQ] = useState("");
  const [query, setQuery] = useState("");
  const [specialty, setSpecialty] = useState("");
  const [topic, setTopic] = useState("all");
  const [type, setType] = useState("all");
  const [period, setPeriod] = useState("all");
  const [guidelineYear, setGuidelineYear] = useState("all");
  const [free, setFree] = useState(false);
  const [sort, setSort] = useState("recent");
  const [page, setPage] = useState(1);
  const [tab, setTab] = useState("live");
  const [mobileFilters, setMobileFilters] = useState(false);
  const [articles, setArticles] = useState<Article[]>([]);
  const [count, setCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [refresh, setRefresh] = useState(0);
  const [modal, setModal] = useState<AppModal>(null);
  const [selected, setSelected] = useState<Article | null>(null);

  useEffect(() => {
    if (tab !== "live") return;
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
  }, [query, topic, type, period, free, sort, page, tab, refresh, specialty]);

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
    if (tab === "sbc") {
      scrollToExplore();
      return;
    }
    setTab("live");
    setRefresh((value) => value + 1);
    scrollToExplore();
  }

  function chooseTopic(value: string) {
    trackClinicalEvent("topic_select", value, tab === "sbc" ? guidelineSourceFor(specialty) : "PubMed");
    setTopic(value);
    if (!specialty) setSpecialty("cardiology");
    setPage(1);
  }

  function trackFilter(eventName: string) {
    trackClinicalEvent(eventName, topic, tab === "sbc" ? guidelineSourceFor(specialty) : "PubMed");
  }

  return {
    q,
    setQ,
    query,
    setQuery,
    specialty,
    setSpecialty,
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
