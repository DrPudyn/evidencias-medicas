import { headers } from "next/headers";
import { notFound, redirect } from "next/navigation";
import { PageShell } from "@/components/page-shell";
import type { Article } from "@/lib/catalog";
import { currentUser, settings } from "@/lib/server";

export const dynamic = "force-dynamic";

export default async function LibraryPage({ params }: { params: Promise<{ lang: string }> }) {
  const { lang } = await params;
  if (lang === "en") redirect("/en/library");
  if (lang !== "pt") notFound();
  return <LibraryList lang="pt" />;
}

export async function LibraryList({ lang }: { lang: "pt" | "en" }) {
  const en = lang === "en";
  const headerList = await headers();
  const user = await currentUser(new Request("https://local/biblioteca", { headers: { cookie: headerList.get("cookie") || "" } }));
  if (!user) {
    const next = en ? "/en/library" : "/pt/biblioteca";
    redirect(`${en ? "/en/entrar" : "/pt/entrar"}?next=${encodeURIComponent(next)}`);
  }
  const rows = await settings().DB.prepare("SELECT article FROM bookmarks WHERE user_id=? ORDER BY created_at DESC").bind(user.id).all<{ article: string }>();
  const articles = rows.results.map((row) => JSON.parse(row.article) as Article);
  const home = en ? "/en#explorar" : "/pt#explorar";
  return (
    <PageShell><main className="guide-page container">
      <p className="eyebrow">{en ? "LIBRARY" : "BIBLIOTECA"}</p>
      <h1>{en ? "My library" : "Minha biblioteca"}</h1>
      <p>{en ? "Articles you saved. Each title opens the PubMed record." : "Artigos que você salvou. Cada título abre o registro no PubMed."}</p>
      {articles.length === 0 ? (
        <p>{en ? "Nothing saved yet." : "Nada salvo ainda."} <a href={home}>{en ? "Search articles" : "Buscar artigos"}</a></p>
      ) : (
        <ul>
          {articles.map((article) => (
            <li key={article.id}>
              <a href={article.url || `https://pubmed.ncbi.nlm.nih.gov/${article.id}/`}>{article.title}</a>
              {article.type ? <small> · {article.type}</small> : null}
              <form method="post" action="/api/bookmarks">
                <input type="hidden" name="action" value="remove" />
                <input type="hidden" name="id" value={article.id} />
                <input type="hidden" name="title" value={article.title} />
                <input type="hidden" name="next" value={en ? "/en/library" : "/pt/biblioteca"} />
                <button type="submit">{en ? "Remove" : "Remover"}</button>
              </form>
            </li>
          ))}
        </ul>
      )}
    </main></PageShell>
  );
}
