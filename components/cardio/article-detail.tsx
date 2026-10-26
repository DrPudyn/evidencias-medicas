"use client";

import { ArrowUpRight, Bookmark } from "lucide-react";
import type { Article } from "@/lib/catalog";
import { trackClinicalEvent } from "@/lib/analytics-client";
import { languageName, prettyDate } from "@/components/cardio/format";
import { Modal } from "@/components/cardio/modal";

export function ArticleDetail({
  article,
  abstract,
  abstractLanguage,
  abstractLoading,
  abstractError,
  saved,
  pending,
  onClose,
  onToggle,
}: {
  article: Article;
  abstract: { label: string; text: string }[];
  abstractLanguage?: string;
  abstractLoading: boolean;
  abstractError: string;
  saved: boolean;
  pending: boolean;
  onClose: () => void;
  onToggle: (article: Article) => void;
}) {
  return (
    <Modal title="Referência do artigo" close={onClose} wide>
      <span className="type-tag">{article.type}</span>
      <h3 className="detail-title">{article.title}</h3>
      <p className="language-note">Idioma original informado pelo PubMed: {languageName(abstractLanguage || article.language)}. Título e resumo no idioma original da publicação.</p>
      <p className="muted">{article.authors}</p>
      <dl className="details">
        <div>
          <dt>Publicação</dt>
          <dd>{article.journal}</dd>
        </div>
        <div>
          <dt>Data</dt>
          <dd>{prettyDate(article.date)}</dd>
        </div>
        <div>
          <dt>PMID</dt>
          <dd>{article.id}</dd>
        </div>
        {article.doi && (
          <div>
            <dt>DOI</dt>
            <dd>{article.doi}</dd>
          </div>
        )}
      </dl>
      <section className="abstract-section" aria-live="polite">
        <div className="abstract-heading">
          <h4>Resumo</h4>
          <span>Fonte: PubMed</span>
        </div>
        {abstractLoading ? (
          <p className="muted">Carregando resumo…</p>
        ) : abstractError ? (
          <p className="muted">{abstractError}</p>
        ) : abstract.length ? (
          abstract.map((section, index) => (
            <p className="abstract-paragraph" key={`${section.label}-${index}`}>
              {section.label !== "Resumo" && <strong>{section.label}: </strong>}
              {section.text}
            </p>
          ))
        ) : (
          <p className="muted">O PubMed não disponibiliza um resumo para esta referência.</p>
        )}
        <p className="abstract-note">O resumo é fornecido pela publicação e não substitui a leitura dos métodos, resultados e limitações do artigo completo.</p>
      </section>
      <div className="inline-actions">
        <a className="button" href={article.url} target="_blank" rel="noreferrer" onClick={() => trackClinicalEvent("source_click", article.topic || "all", "PubMed")}>
          Ler no PubMed <ArrowUpRight size={17} />
        </a>
        <button className="button secondary" onClick={() => onToggle(article)} disabled={pending}>
          <Bookmark size={17} />
          {saved ? "Remover dos salvos" : "Salvar leitura"}
        </button>
      </div>
    </Modal>
  );
}
