import type { MetadataRoute } from "next";
import { SITE_ORIGIN } from "@/lib/site-url";
export default function sitemap():MetadataRoute.Sitemap{
 return ["pt","en"].map(lang=>({url:SITE_ORIGIN+"/"+lang,alternates:{languages:{"pt-BR":SITE_ORIGIN+"/pt",en:SITE_ORIGIN+"/en"}}}));
}
