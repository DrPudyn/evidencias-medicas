import { notFound, redirect } from "next/navigation";

export default async function RegisterPt({ params, searchParams }: { params: Promise<{ lang: string }>; searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const { lang } = await params;
  const query = await searchParams;
  const next = typeof query.next === "string" ? query.next : "";
  const error = typeof query.erro === "string" ? query.erro : "";
  const email = typeof query.email === "string" ? query.email : "";
  if (lang === "en") redirect(`/en/register?next=${encodeURIComponent(next)}&erro=${encodeURIComponent(error)}&email=${encodeURIComponent(email)}`);
  if (lang !== "pt") notFound();
  const { AuthForm } = await import("@/components/auth-form");
  const { PageShell } = await import("@/components/page-shell");
  const { normalizeEmail, validEmail } = await import("@/lib/auth-identity");
  const { safeNext } = await import("@/lib/safe-next");
  const address = normalizeEmail(email);
  return <PageShell><AuthForm lang="pt" mode="register" error={error} email={validEmail(address) ? address : ""} next={safeNext(next, "/pt")} /></PageShell>;
}
