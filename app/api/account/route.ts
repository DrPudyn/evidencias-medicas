import { currentUser, digest, json, sameOrigin, sessionCookie, settings } from "@/lib/server";
export async function GET(req:Request){try{return json({user:await currentUser(req)});}catch{return json({error:"Conta temporariamente indisponível."},503);}}
export async function PATCH(){return json({error:"O cadastro utiliza apenas e-mail e senha."},405);}
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
