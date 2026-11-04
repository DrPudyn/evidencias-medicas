import { body,json,sameOrigin,settings } from "@/lib/server";
import { requireAdmin,audit } from "@/lib/admin";
import { allGuidelines } from "@/data/catalogo";
import { linkResult } from "@/lib/link-check";
// Only versioned catalog URLs may be requested; redirects are never followed.
const urls=[...new Set(allGuidelines.map(item=>item.url))].filter(value=>{const url=new URL(value);return url.protocol==="https:"&&!url.username&&!url.password;});
type Check={url:string;status_code:number|null;result:string;duration_ms:number;checked_at:number};
export async function GET(req:Request){
 if(!await requireAdmin(req))return json({error:"Sessão administrativa necessária."},401);
 const rows=await settings().DB.prepare("SELECT url,status_code,result,duration_ms,checked_at FROM catalog_link_checks").all<Check>();
 const checks=new Map(rows.results.map(({url,...row})=>[url,row]));
 return json({total:urls.length,documents:allGuidelines.length,items:urls.map(url=>({url,documents:allGuidelines.filter(item=>item.url===url).map(item=>({id:item.id,title:item.title,society:item.provenance.society})),...(checks.get(url)||{result:"pending",status_code:null,checked_at:null,duration_ms:null})}))});
}
export async function POST(req:Request){
 if(!sameOrigin(req))return json({error:"Origem não autorizada."},403);
 const admin=await requireAdmin(req);if(!admin)return json({error:"Sessão administrativa necessária."},401);
 try{
  const input=await body(req),offset=input.offset??0;
  if(!Number.isInteger(offset)||offset<0||offset>urls.length)return json({error:"Lote inválido."},400);
  const batch=urls.slice(offset,offset+10),db=settings().DB;
  const check=async(url:string)=>{
   const start=Date.now();let status:number|null=null,result="unknown";
   try{const response=await fetch(url,{method:"HEAD",redirect:"manual",signal:AbortSignal.timeout(6000)});status=response.status;result=linkResult(status);await response.body?.cancel();}catch{/* Requires manual review. */}
   const duration=Date.now()-start;
   await db.prepare("INSERT INTO catalog_link_checks(url,status_code,result,duration_ms,checked_at) VALUES(?,?,?,?,?) ON CONFLICT(url) DO UPDATE SET status_code=excluded.status_code,result=excluded.result,duration_ms=excluded.duration_ms,checked_at=excluded.checked_at").bind(url,status,result,duration,Date.now()).run();
   return {url,status,result,duration};
  };
  const results=[];for(let index=0;index<batch.length;index+=5)results.push(...await Promise.all(batch.slice(index,index+5).map(check)));
  if(offset===0&&batch.length)await audit("catalog_links_check_started","success",admin.id);
  const nextOffset=offset+batch.length,done=nextOffset>=urls.length;
  if(done)await audit("catalog_links_checked","success",admin.id);
  return json({results,checked:results.length,total:urls.length,nextOffset,done,method:"HEAD; sem seguir redirecionamentos"});
 }catch{return json({error:"Não foi possível verificar este lote de links."},502);}
}
