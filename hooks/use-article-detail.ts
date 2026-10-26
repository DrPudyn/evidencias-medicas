"use client";

import { useEffect, useState } from "react";
import type { AbstractSection } from "@/lib/catalog";
import { api } from "@/components/cardio/api";

export function useArticleDetail(modal: string | null, selectedId: string | undefined) {
  const [abstract, setAbstract] = useState<AbstractSection[]>([]);
  const [abstractLanguage, setAbstractLanguage] = useState<string | undefined>();
  const [abstractLoading, setAbstractLoading] = useState(false);
  const [abstractError, setAbstractError] = useState("");

  useEffect(() => {
    if (modal !== "detail" || selectedId === undefined) return;
    const controller = new AbortController();
    api<{ sections?: AbstractSection[]; language?: string }>(`/api/articles/${selectedId}`, { signal: controller.signal })
      .then((data) => {
        setAbstract(data.sections || []);
        setAbstractLanguage(data.language);
      })
      .catch((failure: { name?: string; message?: string }) => {
        if (failure.name !== "AbortError") setAbstractError(failure.message || "");
      })
      .finally(() => {
        if (!controller.signal.aborted) setAbstractLoading(false);
      });
    return () => controller.abort();
  }, [modal, selectedId]);

  function prepareDetail() {
    setAbstract([]);
    setAbstractLanguage(undefined);
    setAbstractError("");
    setAbstractLoading(true);
  }

  return { abstract, abstractLanguage, abstractLoading, abstractError, prepareDetail };
}
