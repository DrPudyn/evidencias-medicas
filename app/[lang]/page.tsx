import type { Metadata } from "next";
import { headers } from "next/headers";
import { notFound } from "next/navigation";
import CardioApp from "../cardio-app";
import { PlansSection } from "@/components/cardio/plans-section";
import { searchArticles } from "@/lib/article-search";
import { BRAND_DESCRIPTION_EN, BRAND_DESCRIPTION_PT, BRAND_NAME, BRAND_TITLE_EN, BRAND_TITLE_PT } from "@/lib/brand";
import { browseFromLink, defaultBrowse } from "@/lib/browse-state";
import type { Article } from "@/lib/catalog";
import { currentUser, settings } from "@/lib/server";
import { getSiteOrigin } from "@/lib/site-url";
import type { Profile } from "@/components/cardio/types";

export async function generateMetadata({ params }: { params: Promise<{ lang: string }> }): Promise<Metadata> {
  const { lang } = await params;
  if (!["pt", "en"].includes(lang)) return {};
  const en = lang === "en";
  const origin = getSiteOrigin();
  const title = en ? BRAND_TITLE_EN : BRAND_TITLE_PT;
  const description = en ? BRAND_DESCRIPTION_EN : BRAND_DESCRIPTION_PT;
  return {
    metadataBase: new URL(origin),
    title,
    description,
    alternates: {
      canonical: `${origin}/${lang}`,
      languages: { "pt-BR": `${origin}/pt`, en: `${origin}/en`, "x-default": `${origin}/pt` },
    },
    openGraph: {
      title: BRAND_NAME,
      description,
      siteName: BRAND_NAME,
      locale: en ? "en_US" : "pt_BR",
      alternateLocale: en ? "pt_BR" : "en_US",
      url: `${origin}/${lang}`,
      type: "website",
    },
    robots: { index: true, follow: true },
  };
}

export default async function LocalizedHome({ params, searchParams }: { params: Promise<{ lang: string }>; searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const { lang } = await params;
  if (!["pt", "en"].includes(lang)) notFound();
  const query = await searchParams;
  const url = new URL(`https://local/${lang}`);
  for (const [key, value] of Object.entries(query)) {
    if (typeof value === "string") url.searchParams.set(key, value);
  }
  const snapshot = browseFromLink(url) ?? defaultBrowse;
  const headerList = await headers();
  const req = new Request(url, { headers: { cookie: headerList.get("cookie") || "", "cf-connecting-ip": headerList.get("cf-connecting-ip") || "" } });
  let articles: Article[] = [];
  let count = 0;
  let error = "";
  if (url.searchParams.get("search") === "1" && snapshot.tab !== "saved" && snapshot.tab !== "sbc" && snapshot.tab !== "collection") {
    const found = await searchArticles(url.searchParams, req);
    articles = found.articles;
    count = found.count;
    error = found.error;
  }
  const user = await currentUser(req);
  let saved: Article[] = [];
  if (user && snapshot.tab === "saved") {
    const rows = await settings().DB.prepare("SELECT article,reading FROM bookmarks WHERE user_id=? ORDER BY created_at DESC").bind(user.id).all<{ article: string; reading: string }>();
    saved = rows.results.map((row) => ({ ...JSON.parse(row.article), reading: JSON.parse(row.reading) }));
  }
  return (
    <CardioApp
      initial={{ ...snapshot, articles, count, error }}
      user={user as Profile | null}
      saved={saved}
      plans={<PlansSection lang={lang === "en" ? "en" : "pt"} />}
    />
  );
}
