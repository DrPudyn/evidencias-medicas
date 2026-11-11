import type { MetadataRoute } from "next";
import { getSiteOrigin } from "@/lib/site-url";
export default function robots():MetadataRoute.Robots{
 const origin=getSiteOrigin();
 return {rules:{userAgent:"*",allow:["/pt","/en"],disallow:["/admin","/api/","/*?*reset=","/*?*verify="]},sitemap:origin+"/sitemap.xml"};
}
