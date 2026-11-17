"use client";

import { useEffect, useState } from "react";
import type { AbstractSection, Article } from "@/lib/catalog";
import { api } from "@/components/cardio/api";

const DETAIL_TIMEOUT_MS = 10_000;

function seeded(article: Article): AbstractSection[] {
  if (article.sections?.length) return article.sections;
  if (article.abstract?.trim()) return [{ label: "Resumo", text: article.abstract.trim() }];
  return [];
}

export function useArticleDetail(article: Article | null) {
  const ready = article ? seeded(article) : [];
  const [fetched, setFetched] = useState<{ id: string; sections: AbstractSection[]; language?: string } | null>(null);
  const [abstractLoading, setAbstractLoading] = useState(false);
  const [abstractError, setAbstractError] = useState("");

  useEffect(() => {
    if (!article || ready.length) return;
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), DETAIL_TIMEOUT_MS);
    let active = true;
    queueMicrotask(() => {
      if (!active) return;
      setAbstractError("");
      setAbstractLoading(true);
    });
    api<{ sections?: AbstractSection[]; language?: string }>(`/api/articles/${article.id}`, { signal: controller.signal })
      .then((data) => {
        if (!active) return;
        setFetched({ id: article.id, sections: data.sections || [], language: data.language });
      })
      .catch((failure: { name?: string; message?: string }) => {
        if (!active) return;
        setAbstractError(failure.name === "AbortError"
          ? "O resumo demorou demais. Abra o registro no PubMed."
          : (failure.message || "Não foi possível carregar o resumo do PubMed agora."));
      })
      .finally(() => {
        clearTimeout(timer);
        if (active) setAbstractLoading(false);
      });
    return () => {
      active = false;
      clearTimeout(timer);
      controller.abort();
    };
  }, [article, ready.length]);

  const fromSearch = ready.length > 0;
  const fetchedForArticle = fetched && article && fetched.id === article.id ? fetched : null;
  return {
    abstract: fromSearch ? ready : (fetchedForArticle?.sections || []),
    abstractLanguage: fromSearch ? article?.language : fetchedForArticle?.language || article?.language,
    abstractLoading: fromSearch ? false : abstractLoading,
    abstractError: fromSearch ? "" : abstractError,
  };
}
