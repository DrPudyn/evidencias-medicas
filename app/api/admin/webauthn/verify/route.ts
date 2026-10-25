import { json, body, sameOrigin, rateLimit, localPreview } from "@/lib/server";
import { createAdminSession, finishAuthentication, finishRegistration, isAdminEmail, requireAdmin, userForSession } from "@/lib/admin";
import { settings } from "@/lib/server";
export async function POST(req:Request){
 if(!sameOrigin(req))return json({error:"Origem não autorizada."},403);
 if(!await rateLimit(req,"admin-webauthn-verify",15))return json({error:"Muitas tentativas. Aguarde antes de tentar novamente."},429);
 try{const input=await body(req),user=await userForSession(req);if(!user)return json({error:"E-mail administrador não autorizado."},403);
  if(input.action==="register"){
   const state=await settings().DB.prepare("SELECT singleton_id FROM admin_bootstrap_state WHERE singleton_id=1").first();const count=await settings().DB.prepare("SELECT COUNT(*) AS n FROM admin_credentials").first<{n:number}>();
   const bootstrap=settings().ADMIN_BOOTSTRAP_ENABLED==="true"&&localPreview(req)&&new URL(req.url).hostname==="localhost"&&!state&&!(count?.n||0);
   if(!bootstrap&&!await requireAdmin(req))return json({error:"A sessão administrativa ativa é necessária."},403);
   await finishRegistration(req,user,String(input.challengeId||""),input.response,bootstrap);
   const setCookie=bootstrap?await createAdminSession(user.id,user.session.digest,req):undefined;
   return json({verified:true,bootstrap},200,setCookie?{"Set-Cookie":setCookie}:{});
  }
  if(input.action==="authenticate"){
   const cookie=await finishAuthentication(req,user,String(input.challengeId||""),input.response);return json({verified:true},200,{"Set-Cookie":cookie});
  }
  return json({error:"Ação inválida."},400);
 }catch(e){return json({error:e instanceof Error?e.message:"Verificação de chave recusada."},400);}
}
