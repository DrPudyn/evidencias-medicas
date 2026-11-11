import type { MetadataRoute } from "next";
import { getSiteOrigin } from "@/lib/site-url";
export default function sitemap():MetadataRoute.Sitemap{
 const origin=getSiteOrigin();
 return ["pt","en"].map(lang=>({url:origin+"/"+lang,alternates:{languages:{"pt-BR":origin+"/pt",en:origin+"/en"}}}));
}
