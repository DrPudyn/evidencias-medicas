"use client";
import { useEffect,useRef,useState } from "react";
import { api } from "@/components/cardio/api";
import { linkLabels } from "@/lib/link-check";
type Item={url:string;documents:{id:string;title:string;society:string}[];result:string;status_code:number|null;checked_at:number|null};
type Data={total:number;documents:number;items:Item[]};
export function CatalogLinks(){
 const [data,setData]=useState<Data>({total:0,documents:0,items:[]}),[filter,setFilter]=useState("attention"),[busy,setBusy]=useState(false),[message,setMessage]=useState("");
 const controller=useRef<AbortController|null>(null);
 useEffect(()=>{const abort=new AbortController();api<Data>("/api/admin/catalog",{signal:abort.signal}).then(setData).catch(error=>{if(!abort.signal.aborted)setMessage(error.message);});return()=>{abort.abort();controller.current?.abort();};},[]);
 async function check(){
  if(controller.current)return;
  const abort=new AbortController();controller.current=abort;setBusy(true);setMessage("Iniciando verificação…");
  try{let offset=0,done=false;while(!done&&!abort.signal.aborted){const batch=await api<{nextOffset:number;done:boolean;total:number}>("/api/admin/catalog",{method:"POST",body:JSON.stringify({offset}),signal:abort.signal});offset=batch.nextOffset;done=batch.done;setMessage(`${offset} de ${batch.total} links verificados.`);setData(await api<Data>("/api/admin/catalog",{signal:abort.signal}));}}
  catch(error){setMessage(abort.signal.aborted?"Verificação interrompida. Resultados concluídos foram preservados.":(error as Error).message);}
  finally{controller.current=null;setBusy(false);}
 }
 const visible=data.items.filter(item=>filter==="all"||(filter==="pending"?item.result==="pending":item.result!=="ok"&&item.result!=="pending"));
 return <section className="admin-visual-panel catalog-links"><h2>Links de todas as sociedades</h2><p>{data.documents} documentos · {data.total} links únicos · {data.items.filter(item=>item.result!=="pending").length} com verificação registrada.</p><p>Respostas 404/410 indicam documento não encontrado. Redirecionamentos, bloqueios e verificações inconclusivas precisam de conferência manual; não provam que o link está quebrado.</p>
 <div className="admin-controls"><button disabled={busy} onClick={()=>void check()}>Verificar todos os links</button>{busy&&<button onClick={()=>controller.current?.abort()}>Interromper</button>}<label>Mostrar <select value={filter} onChange={event=>setFilter(event.target.value)}><option value="attention">Precisam de conferência</option><option value="pending">Ainda não verificados</option><option value="all">Todos</option></select></label></div><p role="status">{message}</p>
 {!visible.length&&<p>Nenhum link nesta seleção.</p>}<ul>{visible.map(item=><li key={item.url}><strong>{linkLabels[item.result]||item.result}</strong> · HTTP {item.status_code??"—"}<br/>{item.documents.map(doc=><span key={doc.id}>{doc.society} · {doc.title}<br/></span>)}<a href={item.url} target="_blank" rel="noreferrer">Abrir fonte original</a>{item.checked_at&&<small> · Conferido em {new Date(item.checked_at).toLocaleString("pt-BR")}</small>}</li>)}</ul>
 </section>;
}
