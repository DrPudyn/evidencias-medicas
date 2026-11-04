"use client";
import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { clinicalFields, type Editorial } from "@/lib/reading";
import { api } from "./api";
import { useLocale } from "@/components/locale-provider";
const Context=createContext<Editorial[]>([]);
export function EditorialProvider({children}:{children:ReactNode}) {
  const [items,setItems]=useState<Editorial[]>([]);
  useEffect(()=>{let active=true;api<{items:Editorial[]}>("/api/editorial").then(d=>{if(active)setItems(d.items);}).catch(()=>{});return()=>{active=false;};},[]);
  return <Context.Provider value={items}>{children}</Context.Provider>;
}
export function EditorialNote({articleId}:{articleId:string}) {
  const items=useContext(Context),{t,locale}=useLocale(),entry=items.find(i=>i.articleId===articleId);
  if(!entry)return null;
  return <details className="editorial-note"><summary>{t("Ficha clínica revisada")} · {new Date(entry.createdAt).toLocaleDateString(locale==="en"?"en-US":"pt-BR")}</summary><p>{t("Revisor")}: {entry.reviewer} · {t("Versão")}: {entry.id.slice(0,8)}</p>{entry.supersededBy&&<p role="note">{t("Documento substituído por")}: {entry.supersededBy}</p>}{Object.entries(clinicalFields).map(([key,label])=><div key={key}><h4>{t(label)}</h4><p style={{whiteSpace:"pre-wrap"}}>{entry[key as keyof typeof clinicalFields]}</p></div>)}<a href={entry.sourceUrl} target="_blank" rel="noreferrer">{t("Abrir publicação")}</a></details>;
}
