import { notFound, redirect } from "next/navigation";
import { AuthForm } from "@/components/auth-form";
import { PageShell } from "@/components/page-shell";
import { safeNext } from "@/lib/safe-next";

export default async function RegisterEn({ params, searchParams }: { params: Promise<{ lang: string }>; searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const { lang } = await params;
  const query = await searchParams;
  const next = typeof query.next === "string" ? query.next : "";
  const error = typeof query.erro === "string" ? query.erro : "";
  if (lang === "pt") redirect(`/pt/cadastro?next=${encodeURIComponent(next)}&erro=${encodeURIComponent(error)}`);
  if (lang !== "en") notFound();
  return <PageShell><AuthForm lang="en" mode="register" error={error} next={safeNext(next, "/en")} /></PageShell>;
}
