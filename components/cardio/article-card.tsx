"use client";

import { EditorialNote, SupersededNotice } from "./editorial";
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
  returnTo = "/pt",
}: {
  article: Article;
  number: string;
  saved: boolean;
  pending: boolean;
  onOpen: (article: Article) => void;
  onToggle: (article: Article) => void;
  returnTo?: string;
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
          <a className="article-title" href={article.url || `https://pubmed.ncbi.nlm.nih.gov/${article.id}/`} onClick={(event) => { event.preventDefault(); onOpen(article); }}>
            {article.title}
          </a>
        )}
        <SupersededNotice articleId={article.id}/>
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
      <form method="post" action="/api/bookmarks" onSubmit={(event) => { event.preventDefault(); onToggle(article); }}>
        <input type="hidden" name="action" value={saved ? "remove" : "save"} />
        <input type="hidden" name="id" value={article.id} />
        <input type="hidden" name="title" value={article.title} />
        <input type="hidden" name="journal" value={article.journal} />
        <input type="hidden" name="authors" value={article.authors} />
        <input type="hidden" name="date" value={article.date} />
        <input type="hidden" name="type" value={article.type} />
        <input type="hidden" name="topic" value={article.topic || "all"} />
        <input type="hidden" name="source" value={article.source || "PubMed"} />
        <input type="hidden" name="next" value={returnTo} />
        <BookmarkButton
          saved={saved}
          pending={pending}
          className={saved ? "bookmark-button selected" : "bookmark-button"}
          label={saved ? `${t("Remover da biblioteca:")} ${article.title}` : `${t("Salvar artigo:")} ${article.title}`}
          title={t("Salvar na biblioteca")}
          onClick={() => undefined}
        />
      </form>
    </article>
  );
}

