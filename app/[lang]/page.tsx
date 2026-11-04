import type { Metadata } from "next";
import { notFound } from "next/navigation";
import CardioApp from "../cardio-app";
import { SITE_ORIGIN } from "@/lib/site-url";
export async function generateMetadata({params}:{params:Promise<{lang:string}>}):Promise<Metadata>{
 const {lang}=await params;if(!["pt","en"].includes(lang))return {};
 const en=lang==="en";
 return {title:en?"Medical Evidence · Find and organize scientific literature":"Evidências Médicas · Busque e organize literatura científica",
 description:en?"Search PubMed across medical specialties, explore guidelines and save scientific articles to your personal library.":"Pesquise no PubMed por especialidade, explore diretrizes e salve artigos científicos em sua biblioteca.",
 alternates:{canonical:SITE_ORIGIN+"/"+lang,languages:{"pt-BR":SITE_ORIGIN+"/pt",en:SITE_ORIGIN+"/en","x-default":SITE_ORIGIN+"/pt"}},
 openGraph:{title:en?"Medical Evidence":"Evidências Médicas",locale:en?"en_US":"pt_BR",alternateLocale:en?"pt_BR":"en_US",url:SITE_ORIGIN+"/"+lang,type:"website"},
 robots:{index:true,follow:true}};
}
export default async function LocalizedHome({params}:{params:Promise<{lang:string}>}){
 const {lang}=await params;if(!["pt","en"].includes(lang))notFound();
 return <CardioApp/>;
}
