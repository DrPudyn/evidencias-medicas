"use client";

import { useLocale } from "@/components/locale-provider";

import { ArrowRight, BookOpen, SlidersHorizontal } from "lucide-react";
import { guidelinesForSpecialty } from "@/data/catalogo";
import { medicalSpecialties } from "@/lib/catalog";
import type { BrowseModel } from "@/components/cardio/catalog-query";
import type { BrowseState } from "@/hooks/use-browse";

export function FilterSidebar({ browse, model }: { browse: BrowseState; model: BrowseModel }) {
  const { t } = useLocale();
  return (
    <aside className={browse.mobileFilters ? "filters filters-open" : "filters"}>
      <div className="filter-header">
        <h3>
          <SlidersHorizontal size={17} />{" " + t("Filtrar artigos") + " "}</h3>
        <button onClick={browse.reset}>{t("Limpar")}</button>
      </div>
      <div className="filter-group">
        <label className="filter-label" htmlFor="specialty-select">{t("ESPECIALIDADE")}</label>
        <select
          id="specialty-select"
          value={browse.specialty}
          onChange={(event) => {
            const next = event.target.value;
            browse.setSpecialty(next);
            browse.setTopic("all");
            browse.setType("all");
            browse.setGuidelineYear("all");
            browse.setQ("");
            browse.setQuery("");
            browse.setPage(1);
            browse.setPeriod("all");
            browse.setFree(false);
            const hasDocuments = guidelinesForSpecialty(next).length > 0;
            if (browse.tab === "sbc" && !hasDocuments) browse.setTab("live");
            if (browse.tab === "collection" && next !== "cardiology" && next !== "endocrinology") {
              browse.setTab(hasDocuments ? "sbc" : "live");
            }
          }}
        >
          <option value="">{t("Selecione uma especialidade")}</option>
          {medicalSpecialties.map(([value, label]) => (
            <option key={value} value={value}>{t(label)}</option>
          ))}
        </select>
      </div>
      {browse.specialty !== "" && (
        <fieldset className="filter-group">
          <legend className="filter-label">{t("TEMA CLÍNICO")}</legend>
          {model.sbcVisibleTopics.map(([value, label]) => (
            <label className="radio-label" key={value}>
              <input type="radio" name="topic" checked={browse.topic === value} onChange={() => browse.chooseTopic(value)} />
              <span className="topic-label">{label}</span>
              {browse.tab === "sbc" && <span className="topic-count">{model.sbcTopicCounts[value] || 0}</span>}
            </label>
          ))}
        </fieldset>
      )}
      <label className="filter-group">
        <span className="filter-label">{browse.tab === "sbc" ? t("TIPO DE DOCUMENTO") : t("TIPO DE ESTUDO")}</span>
        <select
          value={browse.type}
          onChange={(event) => {
            browse.trackFilter("filter_type");
            browse.setType(event.target.value);
            browse.setPage(1);
          }}
        >
          {browse.tab === "sbc" ? (
            <>
              <option value="all">{t("Todos os documentos")}{" "}{model.societyLabel}</option>
              {model.sbcKinds.map((kind) => (
                <option key={t(kind)} value={kind}>{kind}</option>
              ))}
            </>
          ) : (
            <>
              <option value="all">{t("Todos os tipos")}</option>
              <option value="trial">{t("Ensaio clínico")}</option>
              <option value="rct">{t("Ensaio clínico randomizado")}</option>
              <option value="review">{t("Revisão")}</option>
              <option value="systematic">{t("Revisão sistemática · filtro PubMed")}</option>
              <option value="meta">{t("Meta-análise")}</option>
              <option value="guideline">{t("Diretriz · tipo PubMed")}</option>
            </>
          )}
        </select>
      </label>
      {browse.tab === "sbc" ? (
        <label className="filter-group">
          <span className="filter-label">{t("ANO DO DOCUMENTO")}</span>
          <select
            value={browse.guidelineYear}
            onChange={(event) => {
              browse.setGuidelineYear(event.target.value);
              browse.setPage(1);
            }}
          >
            <option value="all">{t("Todos os anos")}</option>
            {model.sbcYears.map((year) => (
              <option key={year} value={year}>{year}</option>
            ))}
          </select>
        </label>
      ) : (
        <label className="filter-group">
          <span className="filter-label">{t("PUBLICAÇÃO")}</span>
          <select
            value={browse.period}
            onChange={(event) => {
              browse.trackFilter("filter_period");
              browse.setPeriod(event.target.value);
              browse.setPage(1);
            }}
          >
            <option value="all">{t("Qualquer período")}</option>
            <option value="30">{t("Últimos 30 dias")}</option>
            <option value="365">{t("Últimos 12 meses")}</option>
            <option value="1825">{t("Últimos 5 anos")}</option>
          </select>
        </label>
      )}
      {browse.tab !== "sbc" && (
        <div className="filter-group">
          <label className="check-label">
            <input
              type="checkbox"
              checked={browse.free}
              onChange={(event) => {
                browse.trackFilter("filter_free");
                browse.setFree(event.target.checked);
                browse.setTab("live");
                browse.setPage(1);
              }}
            />
            <span>{t("Texto completo gratuito")}</span>
          </label>
          <small>{t("Disponibilidade informada pelo PubMed.")}</small>
        </div>
      )}
      <div className="sidebar-note">
        <BookOpen size={22} />
        <h4>{t("Leia além do título.")}</h4>
        <p>{t("Confira a população estudada, os resultados e as limitações na fonte original.")}</p>
        <button onClick={() => browse.setModal("guide")}>{" " + t("Abrir guia") + " "}<ArrowRight size={14} />
        </button>
      </div>
    </aside>
  );
}
