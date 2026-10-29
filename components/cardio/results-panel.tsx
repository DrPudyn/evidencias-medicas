"use client";

import { useLocale } from "@/components/locale-provider";

import { ArrowLeft, ArrowRight, Bookmark, BookOpen, ExternalLink, LoaderCircle, Search, ShieldCheck, SlidersHorizontal, Star } from "lucide-react";
import type { Article } from "@/lib/catalog";
import type { BrowseModel } from "@/components/cardio/catalog-query";
import { ArticleCard } from "@/components/cardio/article-card";
import { GuidelineEmpty, GuidelineList, GuidelineNotice } from "@/components/cardio/catalog-view";
import type { BrowseState } from "@/hooks/use-browse";

const ENDOCRINOLOGY_CLASSICS =
  "Ensaios que marcaram a pesquisa em diabetes tipo 1, diabetes tipo 2 e prevenção. Leia métodos, resultados e limitações nos registros originais; estes estudos históricos não substituem recomendações atuais. Para publicações recentes, consulte o ";
const CARDIOLOGY_CLASSICS =
  "Ensaios que marcaram a pesquisa cardiovascular e ajudam a entender como as evidências evoluíram. São complementados por estudos e diretrizes posteriores e não substituem recomendações atuais. Para publicações recentes, consulte o ";

function tabIcon(value: string) {
  if (value === "saved") return <Bookmark size={15} />;
  if (value === "live") return <Search size={15} />;
  if (value === "sbc") return <ExternalLink size={15} />;
  return <BookOpen size={15} />;
}

export function ResultsPanel({
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
  const { t, locale } = useLocale();
  const tabs: [string, string][] = [
    ...(model.hasClassics ? [["collection", t("Estudos clássicos")] as [string, string]] : []),
    ["live", t("Artigos PubMed")],
    ...(model.hasBrazilianCatalog
      ? [["sbc", `${locale === "en" ? "Guidelines" : "Diretrizes"} ${model.societyLabel}`] as [string, string]]
      : []),
    ["saved", t("Minha biblioteca")],
  ];
  const totalLabel = browse.tab === "live" ? browse.count.toLocaleString(locale === "en" ? "en-US" : "pt-BR") : browse.tab === "sbc" ? model.sbcMatches.length : model.shown.length;
  const noun = browse.tab === "live" ? t("resultados") : browse.tab === "sbc" ? `${locale === "en" ? "documents" : "documentos"} ${model.societyLabel}` : t("artigos");
  const pageCount = Math.min(100, Math.ceil(browse.count / 12));

  return (
    <div className="results">
      <div className="tabs" role="tablist" aria-label={t("Origem dos artigos")}>
        {tabs.map(([value, label]) => (
          <button role="tab" aria-selected={browse.tab === value} className={browse.tab === value ? "active" : ""} key={value} onClick={() => onChooseTab(value)}>
            {tabIcon(value)} {label}
            {value === "sbc" && <span className="count-badge">{model.activeGuidelines.length}</span>}
            {value === "saved" && saved.length > 0 && <span className="count-badge">{saved.length}</span>}
          </button>
        ))}
      </div>
      <form className="results-search" onSubmit={browse.search}>
        <Search size={18} />
        <input
          aria-label={browse.tab === "sbc" ? `${locale === "en" ? "Search guidelines from" : "Buscar nas diretrizes da"} ${model.societyLabel}` : t("Refinar busca de artigos")}
          placeholder={browse.tab === "sbc" ? t("Buscar diretriz, tema ou especialidade...") : t("Doença, medicamento, autor ou PMID...")}
          value={browse.q}
          onChange={(event) => browse.setQ(event.target.value)}
          maxLength={200}
        />
        <button aria-label={browse.tab === "sbc" ? `${locale === "en" ? "Search guidelines" : "Buscar nas diretrizes"} ${model.societyLabel}` : t("Pesquisar no PubMed")}>
          <ArrowRight size={19} />
        </button>
      </form>
      <div className="results-toolbar">
        <span>
          {browse.loading && browse.tab === "live" ? (
            t("Consultando o PubMed...")
          ) : (
            <>
              <strong>{totalLabel}</strong> {noun}
              {browse.query && <>{" "}{t("para “")}{browse.query}”</>}
            </>
          )}
        </span>
        <div>
          <button className="mobile-filter-button" onClick={() => browse.setMobileFilters((value) => !value)}>
            <SlidersHorizontal size={16} />{" "}{t("Filtros")}{" "}{model.activeFilters || ""}
          </button>
          {browse.tab !== "sbc" && (
            <label className="sort-label">
              <span>{t("Ordenar:")}</span>
              <select
                aria-label={t("Ordenar artigos")}
                value={browse.sort}
                onChange={(event) => {
                  browse.trackFilter("sort_change");
                  browse.setSort(event.target.value);
                  browse.setPage(1);
                }}
              >
                <option value="recent">{t("Data de publicação (mais recente)")}</option>
                <option value="relevance">{t("Relevância · PubMed Best Match")}</option>
              </select>
            </label>
          )}
        </div>
      </div>
      {browse.tab === "collection" && (
        <div className="collection-notice classical-notice">
          <Star size={17} className="classical-star" />
          <p>
            <strong>{t("Estudos clássicos")} · {browse.specialty === "endocrinology" ? t("Endocrinologia e Metabologia") : t("Cardiologia")}</strong>
            <br />
            {t(browse.specialty === "endocrinology" ? ENDOCRINOLOGY_CLASSICS : CARDIOLOGY_CLASSICS)}
            <button
              onClick={() => {
                browse.setTab("live");
                browse.setPage(1);
              }}
            >
              PubMed
            </button>
            .
          </p>
        </div>
      )}
      {browse.tab === "sbc" && <GuidelineNotice specialty={browse.specialty} />}
      {browse.tab === "sbc" ? (
        model.sbcMatches.length === 0 ? (
          <GuidelineEmpty specialty={browse.specialty} source={model.guidelineSource} />
        ) : (
          <GuidelineList guidelines={model.sbcMatches} source={model.guidelineSource} saved={saved} saving={saving} onToggle={onToggleSaved} />
        )
      ) : browse.loading && browse.tab === "live" ? (
        <div className="loading-state" role="status">
          <LoaderCircle className="spin" size={28} />
          <p>{t("Buscando evidências na fonte…")}</p>
          <small>{t("Consultando títulos, resumos e descritores no PubMed.")}</small>
        </div>
      ) : browse.error && browse.tab === "live" ? (
        <div className="empty-state" role="alert">
          <Search size={30} />
          <h3>{t("A busca está indisponível agora.")}</h3>
          <p>{t(browse.error)}</p>
          <div className="inline-actions">
            <button className="button" onClick={() => browse.setRefresh((value) => value + 1)}>{" " + t("Tentar novamente") + " "}</button>
            <button className="button secondary" onClick={onShowInitialCollection}>{" " + t("Ver coleção inicial") + " "}</button>
          </div>
        </div>
      ) : model.shown.length === 0 ? (
        <div className="empty-state">
          <Bookmark size={30} />
          <h3>
            {browse.tab === "saved"
              ? t("Sua próxima leitura merece um lugar.")
              : !browse.specialty && !browse.query
                ? t("Escolha uma especialidade ou informe um termo.")
                : t("Nenhum artigo com esses filtros.")}
          </h3>
          <p>
            {browse.tab === "saved"
              ? t("Use o ícone de marcador em um artigo para guardá-lo aqui.")
              : !browse.specialty && !browse.query
                ? t("A busca geral fica mais precisa com uma especialidade ou palavra-chave.")
                : t("Experimente remover um filtro ou buscar outro termo.")}
          </p>
          <button className="button secondary" onClick={onClearResults}>
            {browse.tab === "saved" ? t("Explorar artigos") : t("Limpar filtros")} <ArrowRight size={16} />
          </button>
        </div>
      ) : (
        <div className="article-list">
          {model.shown.map((article, index) => (
            <ArticleCard
              key={article.id}
              article={article}
              number={String((browse.page - 1) * 12 + index + 1).padStart(2, "0")}
              saved={saved.some((item) => item.id === article.id)}
              pending={saving === article.id}
              onOpen={onOpenArticle}
              onToggle={onToggleSaved}
            />
          ))}
        </div>
      )}
      {browse.tab === "live" && browse.count > 12 && !browse.loading && !browse.error && (
        <div className="pagination">
          <button className="button secondary small" disabled={browse.page === 1} onClick={() => browse.setPage((value) => value - 1)}>
            <ArrowLeft size={15} />{" " + t("Anterior") + " "}</button>
          <span>{" "}{t("Página")}{" "}{browse.page}{" "}{t("de")}{" "}{pageCount}
          </span>
          <button className="button secondary small" disabled={browse.page >= pageCount} onClick={() => browse.setPage((value) => value + 1)}>{" " + t("Próxima") + " "}<ArrowRight size={15} />
          </button>
        </div>
      )}
      <div className="source-foot">
        <ShieldCheck size={14} />{" " + t("Referências com acesso à fonte original. Acesso ao texto completo depende da publicação.") + " "}</div>
    </div>
  );
}

