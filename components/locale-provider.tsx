"use client";

import { createContext, useContext, useEffect, useSyncExternalStore, type ReactNode } from "react";
import { BRAND_DESCRIPTION_EN, BRAND_DESCRIPTION_PT, BRAND_TITLE_EN, BRAND_TITLE_PT } from "@/lib/brand";
import { english } from "@/lib/i18n/en";
import { resolveLocale } from "@/lib/i18n/locale";

export type Locale = "pt" | "en";
const KEY = "em-language";
const EVENT = "em:language-change";

function snapshot(): Locale {
  const pathLocale=window.location.pathname.split("/")[1];
  const requested=pathLocale==="en"||pathLocale==="pt"?pathLocale:new URLSearchParams(window.location.search).get("lang");
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

export function LocaleProvider({ children, initialLocale="pt" }: { children: ReactNode; initialLocale?:Locale }) {
  const locale = useSyncExternalStore(subscribe, snapshot, () => initialLocale);
  function setLocale(next: Locale) {
    try { localStorage.setItem(KEY, next); } catch {}
    const url = new URL(window.location.href);
    url.pathname="/"+next;
    url.searchParams.delete("lang");
    window.history.replaceState(window.history.state, "", url);
    window.dispatchEvent(new Event(EVENT));
  }
  useEffect(() => {
    document.documentElement.lang = locale === "en" ? "en" : "pt-BR";
    if(window.location.pathname.startsWith("/admin"))return;
    document.querySelector('link[rel="canonical"]')?.setAttribute("href",window.location.origin+"/"+locale);
    document.title = locale === "en" ? BRAND_TITLE_EN : BRAND_TITLE_PT;
    const description = document.querySelector('meta[name="description"]');
    description?.setAttribute("content", locale === "en" ? BRAND_DESCRIPTION_EN : BRAND_DESCRIPTION_PT);
  }, [locale]);
  return <LocaleContext.Provider value={{ locale, setLocale, t: (text) => locale === "en" ? english[text] ?? text : text }}>{children}</LocaleContext.Provider>;
}

export function useLocale() {
  return useContext(LocaleContext);
}

export function LanguageSwitcher() {
  const { locale, setLocale } = useLocale();
  return <div className="lang-switch" role="group" aria-label={locale === "en" ? "Language" : "Idioma"}>
    {(["pt", "en"] as const).map((value) => <a key={value} href={"/"+value}
      lang={value === "pt" ? "pt-BR" : "en"}
      aria-label={value === "pt" ? "Português" : "English"}
      aria-current={locale === value ? "page" : undefined}
      onClick={(event) => {event.preventDefault();setLocale(value);}}>
      {value.toUpperCase()}
    </a>)}
  </div>;
}
