import { headers } from "next/headers";
import { notFound } from "next/navigation";
import { PageShell } from "@/components/page-shell";
import { articlePath } from "@/lib/article-path";
import type { AbstractSection, Article } from "@/lib/catalog";
import { fetchPubmedAbstract } from "@/lib/pubmed";
import { currentUser, settings } from "@/lib/server";

export async function ArticleRecord({ lang, id }: { lang: "pt" | "en"; id: string }) {
  if (!/^\d{1,12}$/.test(id)) notFound();
  const en = lang === "en";
  const headerList = await headers();
  const user = await currentUser(new Request(`https://local${articlePath(lang, id)}`, { headers: { cookie: headerList.get("cookie") || "" } }));
  let stored: Article | null = null;
  if (user) {
    const row = await settings().DB.prepare("SELECT article FROM bookmarks WHERE user_id=? AND article_id=?").bind(user.id, id).first<{ article: string }>();
    if (row) stored = JSON.parse(row.article) as Article;
  }
  let sections: AbstractSection[] = stored?.sections || [];
  if (!sections.length && stored?.abstract) sections = [{ label: en ? "Abstract" : "Resumo", text: stored.abstract }];
  let error = "";
  if (!sections.length) {
    try {
      const fetched = await fetchPubmedAbstract(id);
      sections = fetched.sections;
    } catch {
      error = en ? "The abstract could not be loaded. Open the PubMed record." : "Não foi possível carregar o resumo. Abra o registro no PubMed.";
    }
  }
  const title = stored?.title || `PMID ${id}`;
  const url = stored?.url || `https://pubmed.ncbi.nlm.nih.gov/${id}/`;
  const library = en ? "/en/library" : "/pt/biblioteca";
  return (
    <PageShell>
      <main className="article-record container">
        <p className="eyebrow">PMID {id}</p>
        <h1>{title}</h1>
        {stored?.type ? <p><span className="type-tag">{stored.type}</span></p> : null}
        <p className="library-meta">
          {stored?.authors ? <span>{stored.authors}</span> : null}
          {stored?.journal ? <span>{stored.journal}</span> : null}
          {stored?.date ? <span>{stored.date}</span> : null}
          {stored?.doi ? <span>DOI {stored.doi}</span> : null}
        </p>
        <section className="abstract-section">
          <h2>{en ? "Abstract" : "Resumo"}</h2>
          {error ? <p>{error} <a href={url}>{en ? "Read on PubMed" : "Ler no PubMed"}</a></p> : null}
          {sections.map((section, index) => (
            <p key={`${section.label}-${index}`}>{section.label && section.label !== "Resumo" ? <strong>{section.label}: </strong> : null}{section.text}</p>
          ))}
        </section>
        <p className="guide-library-link"><a href={url}>{en ? "Read on PubMed" : "Ler no PubMed"}</a> · <a href={library}>{en ? "Back to the library" : "Voltar à biblioteca"}</a></p>
      </main>
    </PageShell>
  );
}
