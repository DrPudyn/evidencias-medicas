import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { GuideArticle } from "@/components/guide-article";
import { PageShell } from "@/components/page-shell";

export const metadata: Metadata = { title: "Search guide · Busca Evidência" };

export default async function GuideEn({ params }: { params: Promise<{ lang: string }> }) {
  const { lang } = await params;
  if (lang === "pt") redirect("/pt/guia");
  if (lang !== "en") notFound();
  return <PageShell><GuideArticle lang="en" /></PageShell>;
}
