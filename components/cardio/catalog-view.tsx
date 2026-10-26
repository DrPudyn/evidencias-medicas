"use client";

import { ArrowUpRight, BookOpen, ExternalLink, Search } from "lucide-react";
import type { Article, BrazilianGuideline } from "@/lib/catalog";
import { trackClinicalEvent } from "@/lib/analytics-client";
import { BookmarkButton } from "@/components/cardio/bookmark-button";
import { guidelineToArticle } from "@/components/cardio/catalog-query";

export function GuidelineNotice({ specialty }: { specialty: string }) {
  return (
    <div className="collection-notice sbc-notice">
      <BookOpen size={15} />
      <p>
        {specialty === "endocrinology" ? (
          <>
            Documentos clínicos localizados no portal da SBEM e no periódico oficial da sociedade, incluindo diretrizes, consensos e posicionamentos com autoria individual ou conjunta. Textos antigos estão identificados como históricos; confira no documento original se houve atualização. A lista não inclui notas administrativas. Consulte o <a href="https://www.endocrino.org.br/diretrizes-da-sbem/" target="_blank" rel="noreferrer">portal de diretrizes da SBEM <ExternalLink size={12} /></a>, o <a href="https://www.aem-sbem.com/article-section/position-statement/" target="_blank" rel="noreferrer">periódico oficial <ExternalLink size={12} /></a> e o <a href="https://diretrizes.amb.org.br/" target="_blank" rel="noreferrer">Projeto Diretrizes da AMB <ExternalLink size={12} /></a> para consultar o acervo e atualizações.
          </>
        ) : (
          <>
            Diretrizes, posicionamentos e recomendações da Sociedade Brasileira de Cardiologia com uma descrição breve do tema e da abrangência. Consulte o <a href="https://www.portal.cardiol.br/diretrizes" target="_blank" rel="noreferrer">acervo oficial da SBC <ExternalLink size={12} /></a> para verificar atualizações e documentos que não estejam nesta seleção local.
          </>
        )}
      </p>
    </div>
  );
}

export function GuidelineEmpty({ specialty, source }: { specialty: string; source: "SBEM" | "SBC" }) {
  return (
    <div className="empty-state">
      <Search size={30} />
      <h3>Sem documento correspondente no catálogo local.</h3>
      <p>Os filtros mostram apenas os documentos cadastrados aqui; consulte o acervo oficial para outros materiais e atualizações.</p>
      <a
        className="button secondary"
        href={specialty === "endocrinology" ? "https://www.endocrino.org.br/diretrizes-da-sbem/" : "https://www.portal.cardiol.br/diretrizes"}
        target="_blank"
        rel="noreferrer"
      >
        Abrir acervo {source} <ExternalLink size={16} />
      </a>
    </div>
  );
}

export function GuidelineList({
  guidelines,
  source,
  saved,
  saving,
  onToggle,
}: {
  guidelines: BrazilianGuideline[];
  source: "SBEM" | "SBC";
  saved: Article[];
  saving: string;
  onToggle: (article: Article) => void;
}) {
  return (
    <div className="article-list">
      {guidelines.map((guideline, index) => {
        const bookmarked = saved.some((item) => item.id === guideline.id);
        const pending = saving === guideline.id;
        const authors = guideline.authorship || `Sociedade Brasileira de ${source === "SBEM" ? "Endocrinologia e Metabologia" : "Cardiologia"}`;
        return (
          <article className="article-card" key={guideline.id}>
            <div className="article-number">{String(index + 1).padStart(2, "0")}</div>
            <div className="article-main">
              <div className="article-meta">
                <span className="type-tag">{guideline.kind}</span>
                <span>{guideline.year}</span>
              </div>
              <a
                className="article-title"
                href={guideline.url}
                target="_blank"
                rel="noreferrer"
                onClick={() => trackClinicalEvent("source_click", guideline.topic, source)}
              >
                {guideline.title}
              </a>
              <p className="article-authors">{authors}</p>
              {guideline.scope && (
                <p className="article-authors guideline-scope">
                  <strong>Escopo:</strong> {guideline.scope}
                </p>
              )}
              <div className="article-bottom">
                <span className="journal">
                  <span /> {source === "SBEM" ? "Archives of Endocrinology and Metabolism · SBEM" : "Arq. Bras. Cardiol. · SBC"}
                </span>
                <a
                  className="article-action-link"
                  href={guideline.url}
                  target="_blank"
                  rel="noreferrer"
                  onClick={() => trackClinicalEvent("source_click", guideline.topic, source)}
                >
                  Abrir publicação <ArrowUpRight size={15} />
                </a>
              </div>
            </div>
            <BookmarkButton
              saved={bookmarked}
              pending={pending}
              className={bookmarked ? "bookmark-button selected source-bookmark" : "bookmark-button source-bookmark"}
              label={bookmarked ? `Remover da biblioteca: ${guideline.title}` : `Salvar documento: ${guideline.title}`}
              title={bookmarked ? "Remover da biblioteca" : "Salvar na biblioteca"}
              onClick={() => onToggle(guidelineToArticle(guideline, source))}
            />
          </article>
        );
      })}
    </div>
  );
}
