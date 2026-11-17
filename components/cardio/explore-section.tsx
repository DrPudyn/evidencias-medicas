"use client";

import type { ReactNode } from "react";
import { useLocale } from "@/components/locale-provider";

import { ArrowUpRight, Compass } from "lucide-react";
import type { Article } from "@/lib/catalog";
import type { BrowseModel } from "@/components/cardio/catalog-query";
import { FilterSidebar } from "@/components/cardio/filter-sidebar";
import { ResultsPanel } from "@/components/cardio/results-panel";
import type { BrowseState } from "@/hooks/use-browse";

export function ExploreSection({
  workspace,
  browse,
  model,
  saved,
  saving,
  onChooseTab,
  onOpenArticle,
  onToggleSaved,
  onShowInitialCollection,
  onClearResults,
  signedIn,
}: {
  workspace?: ReactNode;
  browse: BrowseState;
  model: BrowseModel;
  saved: Article[];
  saving: string;
  onChooseTab: (value: string) => void;
  onOpenArticle: (article: Article) => void;
  onToggleSaved: (article: Article) => void;
  onShowInitialCollection: () => void;
  onClearResults: () => void;
  signedIn: boolean;
}) {
  const { t, locale } = useLocale();
  return (
    <section className="explore container">
      <div className="section-top">
        <div>
          <div id="explorar" className="eyebrow">{t("SUA PRÓXIMA LEITURA COMEÇA AQUI")}</div>
          <h2>{t("Explore a evidência.")}</h2>
          <p>{t("Uma busca mais focada. Uma biblioteca com o seu ritmo.")}</p>
        </div>
        <a className="guide-link" href={locale === "en" ? "/en/guide" : "/pt/guia"}>
          <Compass size={18} />{" " + t("Como fazer uma boa busca") + " "}<ArrowUpRight size={16} />
        </a>
      </div>
      <div className={browse.tab === "saved" ? "browse-layout library-layout" : "browse-layout"}>
        {browse.tab !== "saved" && <FilterSidebar browse={browse} model={model} />}
        <ResultsPanel
          workspace={workspace}
          browse={browse}
          model={model}
          saved={saved}
          saving={saving}
          onChooseTab={onChooseTab}
          onOpenArticle={onOpenArticle}
          onToggleSaved={onToggleSaved}
          onShowInitialCollection={onShowInitialCollection}
          onClearResults={onClearResults}
          signedIn={signedIn}
        />
      </div>
    </section>
  );
}
