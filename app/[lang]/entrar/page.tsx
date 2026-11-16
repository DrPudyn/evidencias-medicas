import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { AuthForm } from "@/components/auth-form";
import { PageShell } from "@/components/page-shell";
import { safeNext } from "@/lib/safe-next";

export const metadata: Metadata = { title: "Entrar · Busca Evidência", robots: { index: false, follow: false } };

export default async function LoginPage({ params, searchParams }: { params: Promise<{ lang: string }>; searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const { lang } = await params;
  if (lang !== "pt" && lang !== "en") notFound();
  const query = await searchParams;
  const error = typeof query.erro === "string" ? query.erro : "";
  const notice = typeof query.aviso === "string" ? query.aviso : "";
  const next = safeNext(query.next, `/${lang}`);
  return <PageShell><AuthForm lang={lang} mode="login" error={error} notice={notice} next={next} /></PageShell>;
}
