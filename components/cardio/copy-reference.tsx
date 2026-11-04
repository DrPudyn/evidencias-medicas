"use client";
import { useEffect,useState } from "react";
import type { Article } from "@/lib/catalog";
import { formatReference } from "@/lib/reference";
import { useLocale } from "@/components/locale-provider";
export function CopyReference({article}:{article:Article}) {
  const {t}=useLocale(),[copied,setCopied]=useState(false),[manual,setManual]=useState(false);
  useEffect(()=>{if(!copied)return;const timer=setTimeout(()=>setCopied(false),4000);return()=>clearTimeout(timer);},[copied]);
  return <div className="copy-reference"><button type="button" className="library-text-action" onClick={async()=>{
    try{await navigator.clipboard.writeText(formatReference(article));setCopied(true);setManual(false);}catch{setManual(true);}
  }}>{t(copied?"Referência copiada":"Copiar referência")}</button>{copied&&<span role="status" className="sr-only">{t("Referência copiada")}</span>}
  {manual&&<label>{t("Copie a referência abaixo")}<textarea readOnly rows={4} value={formatReference(article)} onFocus={event=>event.target.select()}/></label>}</div>;
}
