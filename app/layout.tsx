import type { Metadata } from "next";
import "./globals.css";
export const metadata: Metadata = { title: "Evidências Médicas · Cardiologia e Endocrinologia", description: "Encontre artigos de cardiologia e endocrinologia, refine sua busca e organize suas leituras científicas.", icons: {icon:"/favicon.svg"}, robots:{index:false,follow:false} };
export default function RootLayout({ children }: { children: React.ReactNode }) { return <html lang="pt-BR"><body>{children}</body></html>; }
