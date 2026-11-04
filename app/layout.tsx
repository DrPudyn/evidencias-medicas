import type { Metadata } from "next";
import { headers } from "next/headers";
import "./globals.css";
import { LocaleProvider } from "@/components/locale-provider";
import InstallApp from "@/components/install-app";
export const metadata: Metadata = { title: "Evidências Médicas · Cardiologia e Endocrinologia", description: "Encontre artigos de cardiologia e endocrinologia, refine sua busca e organize suas leituras científicas.", referrer: "no-referrer", icons: {icon:"/favicon.svg",apple:"/icons/apple-touch-icon.png"}, manifest:"/manifest.webmanifest", appleWebApp:{capable:true,title:"Evidências",statusBarStyle:"default"}, robots:{index:false,follow:false} };
export const viewport = {width:"device-width",initialScale:1,viewportFit:"cover",themeColor:"#16342f"};
export default async function RootLayout({ children }: { children: React.ReactNode }) {
 const locale=(await headers()).get("x-site-locale")==="en"?"en":"pt";
 return <html lang={locale==="en"?"en":"pt-BR"}><body><LocaleProvider initialLocale={locale}>{children}<InstallApp/></LocaleProvider></body></html>;
}
