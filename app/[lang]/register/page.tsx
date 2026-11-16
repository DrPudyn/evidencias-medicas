import { notFound, redirect } from "next/navigation";
import { AuthForm } from "@/components/auth-form";
import { PageShell } from "@/components/page-shell";
import { normalizeEmail, validEmail } from "@/lib/auth-identity";
import { safeNext } from "@/lib/safe-next";

export default async function RegisterEn({ params, searchParams }: { params: Promise<{ lang: string }>; searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const { lang } = await params;
  const query = await searchParams;
  const next = typeof query.next === "string" ? query.next : "";
  const error = typeof query.erro === "string" ? query.erro : "";
  const email = typeof query.email === "string" ? query.email : "";
  if (lang === "pt") redirect(`/pt/cadastro?next=${encodeURIComponent(next)}&erro=${encodeURIComponent(error)}&email=${encodeURIComponent(email)}`);
  if (lang !== "en") notFound();
  const address = normalizeEmail(email);
  return <PageShell><AuthForm lang="en" mode="register" error={error} email={validEmail(address) ? address : ""} next={safeNext(next, "/en")} /></PageShell>;
}
