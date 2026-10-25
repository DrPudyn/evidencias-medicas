import { json, body, sameOrigin, settings, rateLimit, localPreview } from "@/lib/server";
import { authenticationOptions, isAdminEmail, registrationOptions, requireAdmin, userForSession } from "@/lib/admin";
export async function POST(req:Request){
 if(!sameOrigin(req))return json({error:"Origem não autorizada."},403);
 if(!await rateLimit(req,"admin-webauthn-options",20))return json({error:"Muitas tentativas. Aguarde antes de tentar novamente."},429);
 try{const input=await body(req);const user=await userForSession(req);if(!user)return json({error:"Entre com o e-mail administrador autorizado."},401);
  if(input.action==="register"){
   const state=await settings().DB.prepare("SELECT singleton_id FROM admin_bootstrap_state WHERE singleton_id=1").first();
   const count=await settings().DB.prepare("SELECT COUNT(*) AS n FROM admin_credentials").first<{n:number}>();
   const bootstrap=settings().ADMIN_BOOTSTRAP_ENABLED==="true"&&localPreview(req)&&new URL(req.url).hostname==="localhost"&&!state&&!(count?.n||0);
   if(!bootstrap&&!await requireAdmin(req))return json({error:"A sessão administrativa ativa é necessária para cadastrar outra chave."},403);
   const result=await registrationOptions(req,user,bootstrap);return json({...result,bootstrap});
  }
  if(input.action==="authenticate"){return json(await authenticationOptions(req,user));}
  return json({error:"Ação inválida."},400);
 }catch(e){return json({error:e instanceof Error?e.message:"Não foi possível iniciar a verificação."},400);}
}
