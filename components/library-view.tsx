"use client";

import { useState } from "react";
import type { MouseEvent } from "react";
import { ArticleDetail } from "@/components/cardio/article-detail";
import { api } from "@/components/cardio/api";
import { useArticleDetail } from "@/hooks/use-article-detail";
import { articlePath } from "@/lib/article-path";
import type { Article } from "@/lib/catalog";

export function LibraryView({ lang, items: initial }: { lang: "pt" | "en"; items: Array<Article & { savedOn?: string }> }) {
  const en = lang === "en";
  const home = en ? "/en#explorar" : "/pt#explorar";
  const back = en ? "/en/library" : "/pt/biblioteca";
  const [items, setItems] = useState(initial);
  const [selected, setSelected] = useState<Article | null>(null);
  const [pending, setPending] = useState("");
  const [error, setError] = useState("");
  const detail = useArticleDetail(selected);

  function openDetail(event: MouseEvent<HTMLAnchorElement>, article: Article) {
    event.preventDefault();
    setSelected(article);
  }

  async function remove(article: Article) {
    setPending(article.id);
    setError("");
    const previous = items;
    setItems((current) => current.filter((item) => item.id !== article.id));
    if (selected?.id === article.id) setSelected(null);
    try {
      await api(`/api/bookmarks?id=${encodeURIComponent(article.id)}`, { method: "DELETE" });
    } catch (failure) {
      setItems(previous);
      setError(failure instanceof Error ? failure.message : (en ? "Could not remove the article." : "Não foi possível remover o artigo."));
    } finally {
      setPending("");
    }
  }

  return (
    <main className="library-page container">
      <p className="eyebrow">{en ? "LIBRARY" : "BIBLIOTECA"}</p>
      <div className="library-heading">
        <h1>{en ? "My library" : "Minha biblioteca"}</h1>
        <p className="library-count">{items.length === 1 ? (en ? "1 saved article" : "1 artigo salvo") : (en ? `${items.length} saved articles` : `${items.length} artigos salvos`)}</p>
      </div>
      <p className="library-lead">{en ? "Open the details here. PubMed stays one click away." : "Os detalhes abrem aqui. O PubMed fica a um clique."}</p>
      {error ? <p className="form-error" role="alert">{error}</p> : null}
      {items.length === 0 ? (
        <div className="library-empty">
          <h2>{en ? "Nothing saved yet" : "Nada salvo ainda"}</h2>
          <p>{en ? "Save an article from the search and it will show up in this list." : "Salve um artigo na busca e ele aparece nesta lista."}</p>
          <a className="button secondary" href={home}>{en ? "Search articles" : "Buscar artigos"}</a>
        </div>
      ) : (
        <ul className="library-list">
          {items.map((article) => (
            <li className="library-row" key={article.id}>
              <div className="library-copy">
                <a className="library-title" href={articlePath(lang, article.id)} onClick={(event) => openDetail(event, article)}>{article.title}</a>
                <p className="library-meta">
                  {article.type ? <span className="type-tag">{article.type}</span> : null}
                  <span>{article.journal}</span>
                  {article.date ? <span>{article.date.slice(0, 4)}</span> : null}
                  {article.savedOn ? <span>{en ? "Saved" : "Salvo"} {article.savedOn}</span> : null}
                </p>
              </div>
              <div className="library-actions">
                <a className="button secondary" href={articlePath(lang, article.id)} onClick={(event) => openDetail(event, article)}>{en ? "View details" : "Ver detalhes"}</a>
                <a className="button secondary" href={article.url || `https://pubmed.ncbi.nlm.nih.gov/${article.id}/`} target="_blank" rel="noreferrer">PubMed</a>
                <form method="post" action="/api/bookmarks" onSubmit={(event) => { event.preventDefault(); void remove(article); }}>
                  <input type="hidden" name="action" value="remove" />
                  <input type="hidden" name="id" value={article.id} />
                  <input type="hidden" name="next" value={back} />
                  <button className="library-remove" type="submit" disabled={pending === article.id}>{en ? "Remove" : "Remover"}</button>
                </form>
              </div>
            </li>
          ))}
        </ul>
      )}
      {selected ? (
        <ArticleDetail
          article={selected}
          abstract={detail.abstract}
          abstractLanguage={detail.abstractLanguage}
          abstractLoading={detail.abstractLoading}
          abstractError={detail.abstractError}
          saved
          pending={pending === selected.id}
          onClose={() => setSelected(null)}
          onToggle={() => void remove(selected)}
        />
      ) : null}
    </main>
  );
}
