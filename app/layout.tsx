import type { Metadata, Viewport } from "next";
import "./globals.css";
import { ServiceWorkerRegistration } from "./service-worker-registration";
export const viewport: Viewport = { themeColor: "#16342f" };
export const metadata: Metadata = { title: "Evidências Médicas · Cardiologia e Endocrinologia", description: "Encontre artigos de cardiologia e endocrinologia, refine sua busca e organize suas leituras científicas.", manifest: "/manifest.webmanifest", other: { "apple-mobile-web-app-capable": "yes" }, appleWebApp: { capable: true, title: "Evidências Médicas", statusBarStyle: "default" }, icons: {icon:"/favicon.svg", apple: "/icons/icon-180.png"}, robots:{index:false,follow:false} };
export default function RootLayout({ children }: { children: React.ReactNode }) { return <html lang="pt-BR"><body>{children}<ServiceWorkerRegistration /></body></html>; }
