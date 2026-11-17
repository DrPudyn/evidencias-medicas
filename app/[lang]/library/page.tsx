import { notFound, redirect } from "next/navigation";
import { LibraryList } from "../biblioteca/page";

export const dynamic = "force-dynamic";

export default async function LibraryEn({ params }: { params: Promise<{ lang: string }> }) {
  const { lang } = await params;
  if (lang === "pt") redirect("/pt/biblioteca");
  if (lang !== "en") notFound();
  return <LibraryList lang="en" />;
}
