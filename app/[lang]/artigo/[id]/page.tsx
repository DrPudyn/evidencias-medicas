import { notFound } from "next/navigation";
import { ArticleRecord } from "@/components/article-record";

export default async function ArticlePage({ params }: { params: Promise<{ lang: string; id: string }> }) {
  const { lang, id } = await params;
  if (lang !== "pt" && lang !== "en") notFound();
  return <ArticleRecord lang={lang} id={id} />;
}
