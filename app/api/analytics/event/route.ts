import { json, body, digest, sameOrigin, settings } from "@/lib/server";
import { societies } from "@/data/catalogo/societies";
import { topics } from "@/lib/catalog";
const events=new Set(["page_view","search","topic_select","filter_type","filter_period","filter_free","sort_change","article_open","source_click","bookmark"]);
export async function POST(req:Request){
 if(!sameOrigin(req))return json({error:"Origem não autorizada."},403);
 try{const p=await body(req),cookies=req.headers.get("cookie")||"",visitor=cookies.match(/(?:^|;\s*)em_analytics=([a-f0-9]{64})(?:;|$)/)?.[1],session=cookies.match(/(?:^|;\s*)em_analytics_session=([a-f0-9]{64})(?:;|$)/)?.[1];if(!visitor||!session)return json({ok:true,recorded:false});
  const event=String(p.event||""),topic=String(p.topic||"all"),source=["PubMed","local","all",...societies.map(s=>s.id)].includes(p.source)?String(p.source):"all";if(!events.has(event)||!topics.some(t=>t[0]===topic))return json({error:"Evento inválido."},400);
  const now=Date.now(),day=new Date(now).toISOString().slice(0,10),db=settings().DB,vh=await digest(visitor),sh=await digest(session);
  const visit=await db.prepare("SELECT visitor_hash,started_at FROM analytics_visits WHERE session_hash=? AND last_seen_at>?").bind(sh,now-1800000).first<{visitor_hash:string;started_at:number}>();if(!visit||visit.visitor_hash!==vh)return json({ok:true,recorded:false});
  await db.prepare("UPDATE analytics_visits SET last_seen_at=? WHERE session_hash=?").bind(now,sh).run();await db.prepare("INSERT INTO analytics_daily_counts(day,event,topic,source,count) VALUES(?,?,?,?,1) ON CONFLICT(day,event,topic,source) DO UPDATE SET count=count+1").bind(day,event,topic,source).run();return json({ok:true,recorded:true});
 }catch{return json({error:"Não foi possível registrar a métrica."},400);}
}

