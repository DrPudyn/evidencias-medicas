import { headers } from "next/headers";
import { notFound, redirect } from "next/navigation";
import { LibraryView } from "@/components/library-view";
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
  const rows = await settings().DB.prepare("SELECT article, created_at FROM bookmarks WHERE user_id=? ORDER BY created_at DESC").bind(user.id).all<{ article: string; created_at: number }>();
  const savedOn = new Intl.DateTimeFormat(en ? "en-GB" : "pt-BR", { timeZone: "America/Sao_Paulo", day: "2-digit", month: "2-digit", year: "numeric" });
  const articles = rows.results.map((row) => ({ ...JSON.parse(row.article) as Article, savedOn: savedOn.format(new Date(row.created_at)) }));
  return <PageShell><LibraryView lang={en ? "en" : "pt"} items={articles} /></PageShell>;
}
