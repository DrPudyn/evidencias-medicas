"use client";

import { useLocale } from "@/components/locale-provider";

import { ArrowUpRight, BookOpen, ExternalLink, Search } from "lucide-react";
import type { Article, BrazilianGuideline } from "@/lib/catalog";
import { societyById, societyForSpecialty } from "@/data/catalogo/societies";
import { trackClinicalEvent } from "@/lib/analytics-client";
import { BookmarkButton } from "@/components/cardio/bookmark-button";
import { guidelineToArticle } from "@/components/cardio/catalog-query";

export function GuidelineNotice({ specialty }: { specialty: string }) {
  const { t } = useLocale();
  const society = societyForSpecialty(specialty);
  if (!society) return null;
  return <div className="collection-notice sbc-notice"><BookOpen size={15} />
    <p><strong>{society.name} · {society.abbreviation}</strong><br />{" "}{t("Seleção de diretrizes, consensos, posicionamentos e recomendações. Documentos conjuntos mantêm as entidades participantes identificadas. Confira o ano e eventuais atualizações na publicação original; textos históricos podem ter sido substituídos.")}{" "}{" "}<a href={society.url} target="_blank" rel="noreferrer">{t("Consultar")}{" "}{society.abbreviation} <ExternalLink size={12} /></a>.
    </p></div>;
}

export function GuidelineEmpty({ specialty, source }: { specialty: string; source: string }) {
  const { t } = useLocale();
  const society = societyForSpecialty(specialty);
  return <div className="empty-state"><Search size={30} />
    <h3>{t("Sem documento correspondente no catálogo local.")}</h3>
    <p>{t("A seleção ainda pode não ter documentos de acesso livre conferidos para esta especialidade. Experimente remover os filtros ou consultar a sociedade; isso não significa que ela não publique diretrizes.")}</p>
    {society && <a className="button secondary" href={society.url} target="_blank" rel="noreferrer">{t("Abrir site")}{" "}{society.abbreviation || source} <ExternalLink size={16} /></a>}
  </div>;
}

export function GuidelineList({ guidelines, source, saved, saving, onToggle }: {
  guidelines: BrazilianGuideline[]; source: string; saved: Article[]; saving: string; onToggle: (article: Article) => void;
}) {
  const { t } = useLocale();
  return <div className="article-list">{guidelines.map((guideline, index) => {
    const bookmarked = saved.some(item => item.id === guideline.id);
    const pending = saving === guideline.id;
    const society = societyById(guideline.provenance.society);
    const labels = (guideline.societyIds || [guideline.provenance.society]).map(id => societyById(id)?.abbreviation || id).join(" / ");
    const article = guidelineToArticle(guideline, source);
    return <article className="article-card" key={guideline.id}>
      <div className="article-number">{String(index + 1).padStart(2, "0")}</div>
      <div className="article-main">
        <div className="article-meta"><span className="type-tag">{guideline.kind}</span><span>{guideline.year}</span>
          {guideline.year < 2020 && <span className="type-tag">{t("Histórico")}</span>}
          {guideline.access === "free-full-text" && <span className="type-tag">{t("Texto completo livre")}</span>}
        </div>
        <a className="article-title" href={guideline.url} target="_blank" rel="noreferrer" onClick={() => trackClinicalEvent("source_click", guideline.topic, guideline.provenance.society)}>{guideline.title}</a>
        <p className="article-authors">{guideline.authorship || society?.name || source}</p>
        {guideline.scope && <p className="article-authors guideline-scope"><strong>{t("Escopo:")}</strong> {guideline.scope}</p>}
        {guideline.provenance.accessedAt && <p className="article-authors">{t("Acesso conferido em")}{" "}{guideline.provenance.accessedAt.split("-").reverse().join("/")}.</p>}
        <div className="article-bottom"><span className="journal"><span /> {article.journal} · {labels}</span>
          <a className="article-action-link" href={guideline.url} target="_blank" rel="noreferrer" onClick={() => trackClinicalEvent("source_click", guideline.topic, guideline.provenance.society)}>{t("Abrir publicação") + " "}<ArrowUpRight size={15} /></a>
        </div>
      </div>
      <BookmarkButton saved={bookmarked} pending={pending} className={bookmarked ? "bookmark-button selected source-bookmark" : "bookmark-button source-bookmark"}
        label={bookmarked ? `${t("Remover da biblioteca:")} ${guideline.title}` : `${t("Salvar documento:")} ${guideline.title}`} title={bookmarked ? "Remover da biblioteca" : t("Salvar na biblioteca")} onClick={() => onToggle(article)} />
    </article>;
  })}</div>;
}
