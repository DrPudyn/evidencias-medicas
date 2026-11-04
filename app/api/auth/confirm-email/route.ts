import { body,digest,json,sameOrigin,settings,rateLimit } from "@/lib/server";
export async function POST(req:Request){
 if(!sameOrigin(req))return json({error:"Origem não autorizada."},403);
 try{
  if(!await rateLimit(req,"confirm-email",30))return json({error:"Limite de tentativas atingido."},429);
  const {token}=await body(req);
  if(typeof token!=="string"||!/^([a-f0-9]{64})$/.test(token))return json({error:"Link inválido ou expirado. Solicite outro."},400);
  const db=settings().DB,key=await digest(token),now=Date.now();
  const results=await db.batch([
   db.prepare("INSERT OR IGNORE INTO users(id,email,profile,created_at,password_hash,email_verified_at) SELECT ?,email,?, ?,password_hash,? FROM email_verifications WHERE digest=? AND expires>?").bind(crypto.randomUUID(),JSON.stringify({role:"member"}),now,now,key,now),
   db.prepare("DELETE FROM email_verifications WHERE digest=?").bind(key)
  ]);
  if(!results[0].meta.changes)return json({error:"Link inválido ou expirado. Solicite outro."},400);
  return json({ok:true,message:"E-mail confirmado. Agora entre com sua senha."});
 }catch{return json({error:"Não foi possível confirmar o e-mail. Tente novamente."},500);}
}
