import { BRAND_NAME } from "@/lib/brand";
import { localPreview, settings } from "@/lib/server";
import { getSiteOrigin, languagePath } from "@/lib/site-url";
export function mailReady(req:Request) {
 const conf=settings();return localPreview(req)||Boolean(conf.RESEND_API_KEY&&conf.EMAIL_FROM);
}
export async function sendAccountLink(req:Request,email:string,lang:string,kind:"verify"|"reset",token:string,admin=false) {
 const locale=lang==="en"?"en":"pt",preview=localPreview(req);
 const link=new URL(languagePath(locale),preview?new URL(req.url).origin:getSiteOrigin());
 link.searchParams.set(kind,token);if(admin)link.searchParams.set("next","admin");
 if(preview)return {previewUrl:link.toString()};
 const conf=settings();
 if(!conf.RESEND_API_KEY||!conf.EMAIL_FROM)throw new Error("O envio de e-mails ainda não está configurado.");
 const title=kind==="verify"?(locale==="en"?"Confirm your email":"Confirme seu e-mail"):(locale==="en"?"Set your password":"Defina sua senha");
 const text=locale==="en"?
  `${title}: ${link}. This link expires in 30 minutes. If you did not request this, ignore this email.`:
  `${title}: ${link}. O link expira em 30 minutos. Se não solicitou, ignore esta mensagem.`;
 const response=await fetch("https://api.resend.com/emails",{method:"POST",headers:{Authorization:`Bearer ${conf.RESEND_API_KEY}`,"Content-Type":"application/json"},body:JSON.stringify({from:conf.EMAIL_FROM,to:[email],subject:title+" · "+BRAND_NAME,text}),signal:AbortSignal.timeout(15000)});
 if(!response.ok)throw new Error("Não foi possível enviar o e-mail. Tente novamente.");
 return {};
}
