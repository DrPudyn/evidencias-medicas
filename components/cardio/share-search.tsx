"use client";
import { useEffect, useState } from "react";
import { Check, Link as LinkIcon } from "lucide-react";
import { useLocale } from "@/components/locale-provider";
import type { BrowseState } from "@/hooks/use-browse";
import { searchLink } from "@/lib/browse-state";

export function ShareSearch({ browse }: { browse: BrowseState }) {
  const { t, locale } = useLocale();
  const [copied, setCopied] = useState(false), [fallback, setFallback] = useState("");
  useEffect(() => {
    if (!copied) return;
    const timer = setTimeout(() => setCopied(false), 4000);
    return () => clearTimeout(timer);
  }, [copied]);
  return <div className="share-search">
    <button className="share-search-button" disabled={!browse.ready} onClick={async () => {
      const link = searchLink(window.location.origin, locale, browse.snapshot);
      try { await navigator.clipboard.writeText(link); setCopied(true); setFallback(""); }
      catch { setFallback(link); }
    }} title={t("O link contém apenas o termo e os filtros da pesquisa.")}>
      {copied ? <Check size={15} /> : <LinkIcon size={15} />} {t(copied ? "Link copiado" : "Compartilhar busca")}
    </button>
    {copied && <span className="sr-only" role="status">{t("Link da busca copiado.")}</span>}
    {fallback && <label>{t("Copie este link")}<input readOnly value={fallback} onFocus={event => event.target.select()} /></label>}
  </div>;
}
