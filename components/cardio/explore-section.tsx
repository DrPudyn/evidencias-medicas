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
}) {
  const { t } = useLocale();
  return (
    <section id="explorar" className="explore container">
      <div className="section-top">
        <div>
          <div className="eyebrow">{t("SUA PRÓXIMA LEITURA COMEÇA AQUI")}</div>
          <h2>{t("Explore a evidência.")}</h2>
          <p>{t("Uma busca mais focada. Uma biblioteca com o seu ritmo.")}</p>
        </div>
        <button className="guide-link" onClick={() => browse.setModal("guide")}>
          <Compass size={18} />{" " + t("Como fazer uma boa busca") + " "}<ArrowUpRight size={16} />
        </button>
      </div>
      {workspace}
      <div className="browse-layout">
        <FilterSidebar browse={browse} model={model} />
        <ResultsPanel
          browse={browse}
          model={model}
          saved={saved}
          saving={saving}
          onChooseTab={onChooseTab}
          onOpenArticle={onOpenArticle}
          onToggleSaved={onToggleSaved}
          onShowInitialCollection={onShowInitialCollection}
          onClearResults={onClearResults}
        />
      </div>
    </section>
  );
}
