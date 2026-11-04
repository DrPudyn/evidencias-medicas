"use client";
import { useEffect, useState } from "react";
import type { AccountController } from "@/hooks/use-account";
import type { BrowseState } from "@/hooks/use-browse";
import type { Article } from "@/lib/catalog";
import { emptyReading, type Reading, type SavedSearch, type SavedQuery } from "@/lib/reading";
import { api } from "./api";
import { useLocale } from "@/components/locale-provider";

function ReadingEditor({article,onSave}:{article:Article;onSave:(id:string,reading:Reading)=>Promise<void>}) {
  const {t}=useLocale();
  const [draft,setDraft]=useState(article.reading||emptyReading),[tags,setTags]=useState((article.reading?.tags||[]).join(", ")),[busy,setBusy]=useState(false),[message,setMessage]=useState("");
  return <details className="reading-item"><summary>{article.title}</summary><form onSubmit={async e=>{e.preventDefault();setBusy(true);setMessage("");try{await onSave(article.id,{...draft,tags:tags.split(",").map(v=>v.trim()).filter(Boolean)});setMessage(t("Leitura atualizada."));}catch(e){setMessage((e as Error).message);}finally{setBusy(false);}}}>
    <a href={article.url} target="_blank" rel="noreferrer">{t("Abrir publicação")}</a>
    <div className="reading-grid"><label>{t("Pasta")}<input maxLength={80} value={draft.folder} onChange={e=>setDraft({...draft,folder:e.target.value})}/></label>
    <label>{t("Status de leitura")}<select value={draft.status} onChange={e=>setDraft({...draft,status:e.target.value as Reading["status"]})}><option value="later">{t("Ler depois")}</option><option value="reading">{t("Em leitura")}</option><option value="read">{t("Lido")}</option></select></label></div>
    <label>{t("Etiquetas separadas por vírgula")}<input value={tags} maxLength={490} onChange={e=>setTags(e.target.value)}/></label>
    <label>{t("Notas pessoais")}<textarea rows={4} maxLength={10000} value={draft.notes} onChange={e=>setDraft({...draft,notes:e.target.value})}/></label>
    <p className="muted">{t("Não inclua dados identificáveis de pacientes.")}</p><button className="button secondary" disabled={busy}>{t("Salvar organização")}</button><p role="status">{message}</p>
  </form></details>;
}

export function ReadingWorkspace({account,browse}:{account:AccountController;browse:BrowseState}) {
  const {t,locale}=useLocale();
  const [searches,setSearches]=useState<SavedSearch[]>([]),[name,setName]=useState(""),[message,setMessage]=useState(""),[busy,setBusy]=useState(false),[filter,setFilter]=useState(""),[folder,setFolder]=useState(""),[status,setStatus]=useState("");
  useEffect(()=>{let active=true;api<{searches:SavedSearch[]}>("/api/saved-searches").then(d=>{if(active)setSearches(d.searches);}).catch(e=>{if(active)setMessage(e.message);});return()=>{active=false;};},[]);
  async function act(task:()=>Promise<void>){setBusy(true);setMessage("");try{await task();}catch(e){setMessage((e as Error).message);}finally{setBusy(false);}}
  function apply(query:SavedQuery){browse.setQ(query.q);browse.setQuery(query.q);browse.setSpecialty(query.specialty);browse.setTopic(query.topic);browse.setType(query.type);browse.setPeriod(query.period);browse.setFree(query.free);browse.setSort(query.sort);browse.setPage(1);browse.setTab("live");browse.setRefresh(v=>v+1);}
  const folders=Array.from(new Set(account.saved.map(a=>a.reading?.folder).filter((v):v is string=>Boolean(v)))).sort();
  const items=account.saved.filter(a=>(!folder||a.reading?.folder===folder)&&(!status||(a.reading?.status||"later")===status)&&[a.title,a.reading?.notes,...(a.reading?.tags||[])].join(" ").toLocaleLowerCase().includes(filter.toLocaleLowerCase()));
  return <section className="reading-workspace" aria-label={t("Organização de leituras")}><details open={browse.tab==="saved"}>
    <summary><strong>{t("Organização de leituras")}</strong> · {account.saved.length} {t("artigos")} · {searches.length} {t("buscas salvas")}</summary>
    <h3>{t("Buscas salvas e novidades")}</h3><p>{t("Verifique novidades quando quiser. A comparação considera até 12 resultados da primeira página; não é um acompanhamento completo nem envia e-mails.")}</p>
    <form className="inline-actions" onSubmit={e=>{e.preventDefault();void act(async()=>{if(browse.tab!=="live"||browse.loading||browse.error)throw new Error(t("Abra uma busca PubMed concluída para salvar."));const query={q:browse.query,specialty:browse.specialty,topic:browse.topic,type:browse.type,period:browse.period,free:browse.free,sort:browse.sort};await api("/api/saved-searches",{method:"POST",body:JSON.stringify({name,query,seenIds:browse.articles.map(a=>a.id)})});setSearches((await api<{searches:SavedSearch[]}>("/api/saved-searches")).searches);setName("");setMessage(t("Busca salva."));});}}>
      <label>{t("Nome da busca")}<input required maxLength={100} value={name} onChange={e=>setName(e.target.value)}/></label><button className="button secondary" disabled={busy||browse.tab!=="live"}>{t("Salvar busca atual")}</button>
    </form>
    {searches.map(search=><div className="reading-item" key={search.id}><strong>{search.name}</strong><p>{search.query.q||t("Todos os temas")} · {t("Última verificação")}: {new Date(search.checkedAt).toLocaleString(locale==="en"?"en-US":"pt-BR")}</p><div className="inline-actions">
      <button className="button secondary" disabled={busy} onClick={()=>apply(search.query)}>{t("Abrir busca")}</button>
      <button className="button secondary" disabled={busy} onClick={()=>void act(async()=>{const result=await api<{articles:Article[]}>(`/api/articles?${new URLSearchParams({...search.query,free:String(search.query.free),page:"1"})}`);const fresh=result.articles.filter(a=>!search.seenIds.includes(a.id));setMessage(`${fresh.length} ${t("resultados diferentes da última verificação na primeira página.")}`);apply(search.query);await api("/api/saved-searches",{method:"PATCH",body:JSON.stringify({id:search.id,seenIds:result.articles.map(a=>a.id)})});setSearches((await api<{searches:SavedSearch[]}>("/api/saved-searches")).searches);})}>{t("Verificar novidades")}</button>
      <button className="button secondary" disabled={busy} onClick={()=>void act(async()=>{await api(`/api/saved-searches?id=${search.id}`,{method:"DELETE"});setSearches(s=>s.filter(v=>v.id!==search.id));})}>{t("Excluir busca")}</button>
    </div></div>)}<p role="status" aria-live="polite">{message}</p>
    <h3>{t("Pastas e notas")}</h3><div className="reading-grid"><label>{t("Buscar título, etiqueta ou nota")}<input value={filter} onChange={e=>setFilter(e.target.value)}/></label><label>{t("Pasta")}<select value={folder} onChange={e=>setFolder(e.target.value)}><option value="">{t("Todas as pastas")}</option>{folders.map(f=><option key={f}>{f}</option>)}</select></label><label>{t("Status de leitura")}<select value={status} onChange={e=>setStatus(e.target.value)}><option value="">{t("Todos")}</option><option value="later">{t("Ler depois")}</option><option value="reading">{t("Em leitura")}</option><option value="read">{t("Lido")}</option></select></label></div>
    {items.map(a=><ReadingEditor key={a.id} article={a} onSave={account.updateReading}/>)}{!items.length&&<p>{t("Nenhuma leitura corresponde aos filtros.")}</p>}
    <button className="button secondary" onClick={()=>{const url=URL.createObjectURL(new Blob([JSON.stringify({exportedAt:new Date().toISOString(),articles:account.saved,searches},null,2)],{type:"application/json"}));const link=document.createElement("a");link.href=url;link.download="minha-biblioteca.json";link.click();setTimeout(()=>URL.revokeObjectURL(url),1000);}}>{t("Exportar biblioteca e buscas")}</button>
  </details></section>;
}
