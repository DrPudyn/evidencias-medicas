import type { Metadata } from "next";
import { notFound } from "next/navigation";
import CardioApp from "../cardio-app";
import { BRAND_DESCRIPTION_EN, BRAND_DESCRIPTION_PT, BRAND_NAME, BRAND_TITLE_EN, BRAND_TITLE_PT } from "@/lib/brand";
import { getSiteOrigin } from "@/lib/site-url";

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

export default async function LocalizedHome({ params }: { params: Promise<{ lang: string }> }) {
  const { lang } = await params;
  if (!["pt", "en"].includes(lang)) notFound();
  return <CardioApp />;
}
