import {body,digest,json,localPreview,profileInput,randomToken,rateLimit,sameOrigin,settings} from "@/lib/server";
import {isAdminEmail} from "@/lib/admin";
export async function POST(req:Request) {
 if(!sameOrigin(req))return json({error:"Origem não autorizada."},403);
 try {
  const p=await body(req); const email=String(p.email||"").trim().toLowerCase();
  if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)||email.length>254) return json({error:"Informe um e-mail válido."},400);
  if(!["register","login"].includes(p.mode))return json({error:"Solicitação inválida."},400);
  const conf=settings(); const preview=localPreview(req),adminBootstrap=p.adminBootstrap===true&&preview&&isAdminEmail(email);
  if(p.adminBootstrap===true&&!adminBootstrap)return json({error:"Cadastro administrativo não autorizado."},403);
  const profile=p.mode==="register"?(adminBootstrap?{name:"Administração do projeto",role:"admin",crm:"",college:"",state:"",phone:"",emailNotifications:false,whatsappNotifications:false}:profileInput(p)):null;
  if(profile&&p.privacyConsent!==true)return json({error:"Confirme a leitura das informações de privacidade."},400);
  if(!preview&&(!conf.RESEND_API_KEY||!conf.EMAIL_FROM))return json({error:"O envio de códigos ainda não foi ativado. Tente novamente após a configuração do serviço de e-mail."},503);
  if(!await rateLimit(req,"otp",20))return json({error:"Limite de solicitações atingido. Tente novamente mais tarde."},429);
  const now=Date.now();const existing=await conf.DB.prepare("SELECT sent_at FROM challenges WHERE email=?").bind(email).first<{sent_at:number}>();
  if(existing&&now-existing.sent_at<60000)return json({error:"Aguarde um minuto antes de solicitar outro código."},429);
  const code=String(crypto.getRandomValues(new Uint32Array(1))[0]%1000000).padStart(6,"0"); const salt=randomToken();
  const payload=JSON.stringify({mode:p.mode,profile,privacyConsentAt:profile?now:null});
  await conf.DB.prepare("INSERT INTO challenges(email,digest,salt,payload,expires,attempts,sent_at) VALUES(?,?,?,?,?,0,?) ON CONFLICT(email) DO UPDATE SET digest=excluded.digest,salt=excluded.salt,payload=excluded.payload,expires=excluded.expires,attempts=0,sent_at=excluded.sent_at").bind(email,await digest(salt+code),salt,payload,now+600000,now).run();
  if(!preview) {let sent=false;try { const res=await fetch("https://api.resend.com/emails",{method:"POST",headers:{Authorization:`Bearer ${conf.RESEND_API_KEY}`,"Content-Type":"application/json"},body:JSON.stringify({from:conf.EMAIL_FROM,to:[email],subject:"Seu código de acesso · Evidências Médicas",text:`Seu código é ${code}. Ele expira em 10 minutos. Se você não solicitou este acesso, ignore esta mensagem.`}),signal:AbortSignal.timeout(15000)}); sent=res.ok; } catch {}
   if(!sent){await conf.DB.prepare("DELETE FROM challenges WHERE email=?").bind(email).run();return json({error:"Não foi possível enviar o código. Tente novamente."},502);}}
  return json({ok:true,preview,...(preview?{previewCode:code}:{})});
 }catch(e){return json({error:e instanceof Error&&/Informe|Selecione|Confirme/.test(e.message)?e.message:"Não foi possível iniciar o acesso."},400);}
}
