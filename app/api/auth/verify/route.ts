import {body,digest,json,randomToken,rateLimit,sameOrigin,sessionCookie,settings} from "@/lib/server";
export async function POST(req:Request) {
 if(!sameOrigin(req))return json({error:"Origem não autorizada."},403);
 try {
  if(!await rateLimit(req,"verify",60))return json({error:"Limite de tentativas atingido."},429);
  const p=await body(req);const email=String(p.email||"").trim().toLowerCase();const code=String(p.code||"");
  if(!/^\d{6}$/.test(code))return json({error:"Informe os seis dígitos do código."},400);
  const db=settings().DB;const now=Date.now();
  const c=await db.prepare("UPDATE challenges SET attempts=attempts+1 WHERE email=? AND expires>? AND attempts<5 RETURNING *").bind(email,now).first<{salt:string;digest:string;payload:string}>();
  if(!c||await digest(c.salt+code)!==c.digest)return json({error:"Código inválido ou expirado. Confira os dígitos ou solicite um novo código."},400);
  const consumed=await db.prepare("DELETE FROM challenges WHERE email=? AND digest=? RETURNING email").bind(email,c.digest).first();if(!consumed)return json({error:"Este código já foi utilizado."},400);
  const payload=JSON.parse(c.payload);let user=await db.prepare("SELECT id,email,profile FROM users WHERE email=?").bind(email).first<{id:string;email:string;profile:string}>();
  if(!user) {if(payload.mode!=="register")return json({error:"Ainda não existe uma conta com este e-mail. Faça seu cadastro."},404);
   const profile=JSON.stringify({...payload.profile,privacyConsentAt:payload.privacyConsentAt,notificationConsentAt:now});const id=crypto.randomUUID();await db.prepare("INSERT INTO users(id,email,profile,created_at) VALUES(?,?,?,?)").bind(id,email,profile,now).run();user={id,email,profile};}
  const token=randomToken();await db.prepare("DELETE FROM sessions WHERE expires < ?").bind(now).run();await db.prepare("INSERT INTO sessions(digest,user_id,expires) VALUES(?,?,?)").bind(await digest(token),user.id,now+604800000).run();
  return json({user:{id:user.id,email:user.email,...JSON.parse(user.profile)}},200,{"Set-Cookie":sessionCookie(token,req)});
 }catch{return json({error:"Não foi possível confirmar o acesso."},500);}
}
