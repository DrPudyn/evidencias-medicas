import { z } from "zod";
import { body, currentUser, json, sameOrigin, settings } from "@/lib/server";
import { searchSchema } from "@/lib/reading";

export async function GET(req: Request) {
  const user = await currentUser(req); if (!user) return json({ error: "Entre para continuar." }, 401);
  const rows = await settings().DB.prepare("SELECT * FROM saved_searches WHERE user_id=? ORDER BY checked_at DESC").bind(user.id).all<{id:string;name:string;query:string;checked_at:number;seen_ids:string}>();
  return json({ searches: rows.results.map(r => ({ id:r.id, name:r.name, query:JSON.parse(r.query), checkedAt:r.checked_at, seenIds:JSON.parse(r.seen_ids) })) });
}
export async function POST(req: Request) {
  if (!sameOrigin(req)) return json({error:"Origem não autorizada."},403);
  const user=await currentUser(req); if(!user)return json({error:"Entre para continuar."},401);
  try {
    const input=z.object({name:z.string().trim().min(1).max(100),query:searchSchema,seenIds:z.array(z.string().regex(/^\d{1,12}$/)).max(12)}).parse(await body(req));
    const id=crypto.randomUUID(), now=Date.now();
    const result=await settings().DB.prepare("INSERT INTO saved_searches(id,user_id,name,query,checked_at,seen_ids) SELECT ?,?,?,?,?,? WHERE (SELECT COUNT(*) FROM saved_searches WHERE user_id=?)<30")
      .bind(id,user.id,input.name,JSON.stringify(input.query),now,JSON.stringify(input.seenIds),user.id).run();
    if(!result.meta.changes)return json({error:"Limite de 30 buscas salvas. Remova uma para continuar."},409);
    return json({id});
  } catch {return json({error:"Busca inválida."},400);}
}
export async function PATCH(req: Request) {
  if (!sameOrigin(req)) return json({error:"Origem não autorizada."},403);
  const user=await currentUser(req); if(!user)return json({error:"Entre para continuar."},401);
  try {
    const input=z.object({id:z.string().uuid(),seenIds:z.array(z.string().regex(/^\d{1,12}$/)).max(12)}).parse(await body(req));
    const result=await settings().DB.prepare("UPDATE saved_searches SET checked_at=?,seen_ids=? WHERE id=? AND user_id=?").bind(Date.now(),JSON.stringify(input.seenIds),input.id,user.id).run();
    return result.meta.changes?json({ok:true}):json({error:"Busca não encontrada."},404);
  }catch{return json({error:"Busca inválida."},400);}
}
export async function DELETE(req: Request) {
  if (!sameOrigin(req)) return json({error:"Origem não autorizada."},403);
  const user=await currentUser(req); if(!user)return json({error:"Entre para continuar."},401);
  await settings().DB.prepare("DELETE FROM saved_searches WHERE id=? AND user_id=?").bind(new URL(req.url).searchParams.get("id"),user.id).run();
  return json({ok:true});
}
