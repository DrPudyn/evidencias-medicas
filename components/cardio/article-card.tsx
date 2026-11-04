"use client";

import { EditorialNote } from "./editorial";
import { useLocale } from "@/components/locale-provider";

import { ArrowUpRight } from "lucide-react";
import type { Article } from "@/lib/catalog";
import { trackClinicalEvent } from "@/lib/analytics-client";
import { BookmarkButton } from "@/components/cardio/bookmark-button";
import { languageName, prettyDate } from "@/components/cardio/format";

export function ArticleCard({
  article,
  number,
  saved,
  pending,
  onOpen,
  onToggle,
}: {
  article: Article;
  number: string;
  saved: boolean;
  pending: boolean;
  onOpen: (article: Article) => void;
  onToggle: (article: Article) => void;
}) {
  const { t, locale } = useLocale();
  const society = Boolean(article.source && article.source !== "PubMed" && article.source !== "local");
  return (
    <article className="article-card">
      <div className="article-number">{number}</div>
      <div className="article-main">
        <div className="article-meta">
          <span className="type-tag">{t(article.type)}</span>
          <span>{society ? article.year : `${t("Publicação")}: ${prettyDate(article.date, locale)}`}</span>
          {article.source !== "SBC" && article.electronicDate && <span>Online: {prettyDate(article.electronicDate, locale)}</span>}
          {article.source !== "SBC" && article.language && <span className="language-tag">{t("Idioma original:")}{" "}{t(languageName(article.language))}</span>}
        </div>
        {society ? (
          <a
            className="article-title"
            href={article.url}
            target="_blank"
            rel="noreferrer"
            onClick={() => trackClinicalEvent("source_click", article.topic || "all", article.source || "SBC")}
          >
            {article.title}
          </a>
        ) : (
          <button className="article-title" onClick={() => onOpen(article)}>
            {article.title}
          </button>
        )}
        <EditorialNote articleId={article.id}/>
        <p className="article-authors">{article.authors}</p>
        <div className="article-bottom">
          <span className="journal">
            <span /> {article.journal}
          </span>
          {society ? (
            <a className="article-action-link" href={article.url} target="_blank" rel="noreferrer">{" " + t("Abrir diretriz") + " "}<ArrowUpRight size={15} />
            </a>
          ) : (
            <button onClick={() => onOpen(article)}>{" " + t("Ver artigo") + " "}<ArrowUpRight size={15} />
            </button>
          )}
        </div>
      </div>
      <BookmarkButton
        saved={saved}
        pending={pending}
        className={saved ? "bookmark-button selected" : "bookmark-button"}
        label={saved ? `${t("Remover da biblioteca:")} ${article.title}` : `${t("Salvar artigo:")} ${article.title}`}
        title={t("Salvar na biblioteca")}
        onClick={() => onToggle(article)}
      />
    </article>
  );
}

