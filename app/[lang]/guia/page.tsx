import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { GuideArticle } from "@/components/guide-article";
import { PageShell } from "@/components/page-shell";

export const metadata: Metadata = { title: "Guia de busca · Busca Evidência" };

export default async function GuidePt({ params }: { params: Promise<{ lang: string }> }) {
  const { lang } = await params;
  if (lang === "en") redirect("/en/guide");
  if (lang !== "pt") notFound();
  return <PageShell><GuideArticle lang="pt" /></PageShell>;
}
