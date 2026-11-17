"use client";

import { EditorialNote, SupersededNotice } from "./editorial";
import { CopyReference } from "./copy-reference";
import { useLocale } from "@/components/locale-provider";

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
  const { t, locale } = useLocale();
  return (
    <Modal title={t("Referência do artigo")} close={onClose} wide>
      <span className="type-tag">{t(article.type)}</span>
      <h3 className="detail-title">{article.title}</h3>
      <p className="language-note">{t("Idioma original informado pelo PubMed:")}{" "}{t(languageName(abstractLanguage || article.language))}{t(". Título e resumo no idioma original da publicação.")}</p>
      <p className="muted">{article.authors}</p>
      <dl className="details">
        <div>
          <dt>{t("Publicação")}</dt>
          <dd>{article.journal}</dd>
        </div>
        <div>
          <dt>{t("Data")}</dt>
          <dd>{prettyDate(article.date, locale)}</dd>
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
      <CopyReference article={article} />
      <SupersededNotice articleId={article.id}/>
        <EditorialNote articleId={article.id}/>
      <section className="abstract-section" aria-live="polite">
        <div className="abstract-heading">
          <h4>{t("Resumo")}</h4>
          <span>{t("Fonte: PubMed")}</span>
        </div>
        {abstractLoading ? (
          <p className="muted">{t("Carregando resumo…")}</p>
        ) : abstractError ? (
          <p className="muted">{t(abstractError)}{" "}<a href={article.url} target="_blank" rel="noreferrer">{t("Ler no PubMed")}</a></p>
        ) : abstract.length ? (
          abstract.map((section, index) => (
            <p className="abstract-paragraph" key={`${section.label}-${index}`}>
              {section.label !== t("Resumo") && <strong>{section.label}: </strong>}
              {section.text}
            </p>
          ))
        ) : (
          <p className="muted">{t("O PubMed não disponibiliza um resumo para esta referência.")}</p>
        )}
        <p className="abstract-note">{t("O resumo é fornecido pela publicação e não substitui a leitura dos métodos, resultados e limitações do artigo completo.")}</p>
      </section>
      <div className="inline-actions">
        <a className="button" href={article.url} target="_blank" rel="noreferrer" onClick={() => trackClinicalEvent("source_click", article.topic || "all", "PubMed")}>{" " + t("Ler no PubMed") + " "}<ArrowUpRight size={17} />
        </a>
        <button className="button secondary" onClick={() => onToggle(article)} disabled={pending}>
          <Bookmark size={17} />
          {saved ? t("Remover dos salvos") : t("Salvar leitura")}
        </button>
      </div>
    </Modal>
  );
}
