import { json, body, digest, randomToken, sameOrigin, settings } from "@/lib/server";
import { pruneAnalytics } from "@/lib/analytics-retention";
const cookie=(name:string,value:string,req:Request,age:number)=>`${name}=${value}; HttpOnly; SameSite=Lax; Path=/; Max-Age=${age}${new URL(req.url).protocol==="https:"?"; Secure":""}`;
export async function POST(req:Request){
 if(!sameOrigin(req))return json({error:"Origem não autorizada."},403);
 try{const p=await body(req),db=settings().DB,now=Date.now();await pruneAnalytics(db,now);if(p.consent!==true){
   const cookies=req.headers.get("cookie")||"",priorToken=cookies.match(/(?:^|;\s*)em_analytics=([a-f0-9]{64})(?:;|$)/)?.[1];
   if(priorToken){const visitorHash=await digest(priorToken);await db.prepare("DELETE FROM analytics_visits WHERE visitor_hash=?").bind(visitorHash).run();await db.prepare("DELETE FROM analytics_visitor_days WHERE visitor_hash=?").bind(visitorHash).run();await db.prepare("DELETE FROM analytics_visitors WHERE visitor_hash=?").bind(visitorHash).run();}
   const headers=new Headers({"Cache-Control":"no-store"});headers.append("Set-Cookie",cookie("em_analytics","",req,0));headers.append("Set-Cookie",cookie("em_analytics_session","",req,0));return Response.json({ok:true,consent:false},{status:200,headers});}
  const cookies=req.headers.get("cookie")||"",priorToken=cookies.match(/(?:^|;\s*)em_analytics=([a-f0-9]{64})(?:;|$)/)?.[1],priorSession=cookies.match(/(?:^|;\s*)em_analytics_session=([a-f0-9]{64})(?:;|$)/)?.[1];
  const token=priorToken||randomToken(),visitorHash=await digest(token),day=new Date(now).toISOString().slice(0,10);
  await db.prepare("INSERT INTO analytics_visitors(visitor_hash,first_seen_day,last_seen_day,first_seen_at,last_seen_at) VALUES(?,?,?,?,?) ON CONFLICT(visitor_hash) DO UPDATE SET last_seen_day=excluded.last_seen_day,last_seen_at=excluded.last_seen_at").bind(visitorHash,day,day,now,now).run();
  await db.prepare("INSERT OR IGNORE INTO analytics_visitor_days(visitor_hash,day) VALUES(?,?)").bind(visitorHash,day).run();
  const priorHash=priorSession?await digest(priorSession):"",live=priorSession?await db.prepare("SELECT session_hash FROM analytics_visits WHERE session_hash=? AND last_seen_at>?").bind(priorHash,now-1800000).first():null,session=live?priorSession!:randomToken(),sessionHash=await digest(session);
  if(live)await db.prepare("UPDATE analytics_visits SET last_seen_at=? WHERE session_hash=?").bind(now,sessionHash).run();else await db.prepare("INSERT INTO analytics_visits(session_hash,visitor_hash,day,started_at,last_seen_at) VALUES(?,?,?,?,?)").bind(sessionHash,visitorHash,day,now,now).run();
  const headers=new Headers({"Cache-Control":"no-store"});headers.append("Set-Cookie",cookie("em_analytics",token,req,15552000));headers.append("Set-Cookie",cookie("em_analytics_session",session,req,1800));return Response.json({ok:true,consent:true},{status:200,headers});
 }catch{return json({error:"Não foi possível salvar sua escolha."},400);}
}
