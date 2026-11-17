import { PLAN_LIMITS } from "@/lib/plans";
import { saoPauloDay } from "@/lib/clinical/quota";
import { hashPassword, validPassword, verifyPassword } from "@/lib/password";
import { currentUser, digest, json, sameOrigin, sessionCookie, settings } from "@/lib/server";

async function planStatus(userId: string) {
  const db = settings().DB;
  const row = await db.prepare("SELECT plan, status FROM subscriptions WHERE user_id=?").bind(userId).first<{ plan: string; status: string }>();
  const premium = row?.plan === "subscriber" && (row.status === "active" || row.status === "trialing");
  const plan = premium ? "subscriber" : "free";
  const day = saoPauloDay();
  const used = await db.prepare("SELECT count FROM clinical_quota WHERE subject_key=? AND day=?").bind(`user:${userId}`, day).first<{ count: number }>();
  return { plan: premium ? "Premium" : "Grátis", limit: PLAN_LIMITS[plan], used: used?.count || 0 };
}

export async function GET(req:Request){
  try{
    const user=await currentUser(req);
    return json({user, plan: user?.id ? await planStatus(user.id) : null});
  }catch{return json({error:"Conta temporariamente indisponível."},503);}
}
export async function PATCH(req:Request){
  if(!sameOrigin(req))return json({error:"Origem não autorizada."},403);
  const user=await currentUser(req);
  if(!user?.id)return json({error:"Entre para continuar."},401);
  const input=await req.json() as { name?: string; theme?: string; currentPassword?: string; newPassword?: string; role?: unknown };
  if ("role" in input) return json({ error: "Este campo não pode ser alterado por aqui." }, 405);
  const db=settings().DB;
  const row=await db.prepare("SELECT profile,password_hash FROM users WHERE id=?").bind(user.id).first<{profile:string;password_hash:string|null}>();
  let profile: { name?: string; theme?: string; role?: string } = {};
  try { profile = JSON.parse(row?.profile || "{}"); } catch { profile = {}; }
  if (typeof input.name === "string" && input.name.trim()) profile.name = input.name.trim().slice(0, 80);
  if (input.theme === "dark" || input.theme === "light") profile.theme = input.theme;
  if (typeof input.newPassword === "string") {
    if (!validPassword(input.newPassword)) return json({ error: "Use uma senha de 12 a 128 caracteres." }, 400);
    if (!await verifyPassword(String(input.currentPassword || ""), row?.password_hash || null)) return json({ error: "A senha atual não confere." }, 400);
    await db.prepare("UPDATE users SET profile=?, password_hash=? WHERE id=?").bind(JSON.stringify(profile), await hashPassword(input.newPassword), user.id).run();
  } else {
    await db.prepare("UPDATE users SET profile=? WHERE id=?").bind(JSON.stringify(profile), user.id).run();
  }
  return json({ user: await currentUser(req) });
}
export async function DELETE(req:Request){
  if(!sameOrigin(req))return json({error:"Origem não autorizada."},403);
  const token=req.headers.get("cookie")?.match(/(?:^|;\s*)em_session=([a-f0-9]{64})(?:;|$)/)?.[1];
  if(token){
    const value=await digest(token),db=settings().DB;
    await db.batch([db.prepare("DELETE FROM admin_sessions WHERE base_session_digest=?").bind(value),db.prepare("DELETE FROM sessions WHERE digest=?").bind(value)]);
  }
  const headers=new Headers();headers.append("Set-Cookie",sessionCookie("",req,true));headers.append("Set-Cookie","admin_session=; HttpOnly; SameSite=Strict; Path=/; Max-Age=0"+(new URL(req.url).protocol==="https:"?"; Secure":""));
  return json({ok:true},200,headers);
}
