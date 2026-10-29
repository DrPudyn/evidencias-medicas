"use client";

import { createContext, useContext, useEffect, useSyncExternalStore, type ReactNode } from "react";
import { english } from "@/lib/i18n/en";
import { resolveLocale } from "@/lib/i18n/locale";

export type Locale = "pt" | "en";
const KEY = "em-language";
const EVENT = "em:language-change";

function snapshot(): Locale {
  const requested = new URLSearchParams(window.location.search).get("lang");
  let saved: string | null = null;
  try { saved = localStorage.getItem(KEY); } catch {}
  return resolveLocale(requested, saved, navigator.language);
}

function subscribe(listener: () => void) {
  window.addEventListener(EVENT, listener);
  window.addEventListener("storage", listener);
  window.addEventListener("popstate", listener);
  return () => {
    window.removeEventListener(EVENT, listener);
    window.removeEventListener("storage", listener);
    window.removeEventListener("popstate", listener);
  };
}

const LocaleContext = createContext<{ locale: Locale; setLocale: (locale: Locale) => void; t: (text: string) => string }>({
  locale: "pt" as Locale,
  setLocale: () => {},
  t: (text: string): string => text,
});

export function LocaleProvider({ children }: { children: ReactNode }) {
  const locale = useSyncExternalStore(subscribe, snapshot, () => "pt" as Locale);
  function setLocale(next: Locale) {
    try { localStorage.setItem(KEY, next); } catch {}
    const url = new URL(window.location.href);
    url.searchParams.set("lang", next);
    window.history.replaceState(window.history.state, "", url);
    window.dispatchEvent(new Event(EVENT));
  }
  useEffect(() => {
    document.documentElement.lang = locale === "en" ? "en" : "pt-BR";
    document.title = locale === "en" ? "Medical Evidence · Scientific literature" : "Evidências Médicas · Literatura científica";
    const description = document.querySelector('meta[name="description"]');
    description?.setAttribute("content", locale === "en"
      ? "Find medical literature, refine your PubMed search and organize your scientific reading."
      : "Encontre literatura médica, refine sua busca no PubMed e organize suas leituras científicas.");
  }, [locale]);
  return <LocaleContext.Provider value={{ locale, setLocale, t: (text) => locale === "en" ? english[text] ?? text : text }}>{children}</LocaleContext.Provider>;
}

export function useLocale() {
  return useContext(LocaleContext);
}

export function LanguageSwitcher() {
  const { locale, setLocale } = useLocale();
  return <div role="group" aria-label={locale === "en" ? "Language" : "Idioma"} style={{ display: "flex", flexShrink: 0, gap: 4 }}>
    {(["pt", "en"] as const).map((value) => <button key={value} type="button"
      lang={value === "pt" ? "pt-BR" : "en"}
      aria-label={value === "pt" ? "Português" : "English"}
      aria-pressed={locale === value}
      onClick={() => setLocale(value)}
      style={{ border: "1px solid #b8ccc4", borderRadius: 6, padding: "6px 8px", cursor: "pointer", fontSize: 12, fontWeight: 600, background: locale === value ? "#1d6153" : "transparent", color: locale === value ? "#fff" : "inherit" }}>
      {value.toUpperCase()}
    </button>)}
  </div>;
}
