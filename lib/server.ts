import { env } from "cloudflare:workers";
import { states } from "./catalog";
export const settings = () => env as unknown as {DB:D1Database; LOCAL_PREVIEW_ENABLED?:string; RESEND_API_KEY?:string; EMAIL_FROM?:string; NCBI_CONTACT_EMAIL?:string; NCBI_API_KEY?:string; ADMIN_EMAILS?:string; ADMIN_BOOTSTRAP_ENABLED?:string; ADMIN_RP_ID?:string; ADMIN_ORIGIN?:string};
export const json = (data:unknown,status=200,headers:HeadersInit={}) => Response.json(data,{status,headers:{"Cache-Control":"no-store",...headers}});
export const digest = async (value:string) => Array.from(new Uint8Array(await crypto.subtle.digest("SHA-256",new TextEncoder().encode(value)))).map(x=>x.toString(16).padStart(2,"0")).join("");
export const randomToken = () => Array.from(crypto.getRandomValues(new Uint8Array(32))).map(x=>x.toString(16).padStart(2,"0")).join("");
export function localPreview(req:Request) { return ["127.0.0.1","localhost","[::1]"].includes(new URL(req.url).hostname) && (process.env.NODE_ENV === "development" || settings().LOCAL_PREVIEW_ENABLED === "true"); }
export function sameOrigin(req:Request) { return req.headers.get("origin") === new URL(req.url).origin; }
export async function body(req:Request) { const raw=await req.text(); if(raw.length>16000) throw new Error("Solicitação muito grande."); return JSON.parse(raw); }
export function profileInput(p:Record<string,unknown>) {
 const profile={name:String(p.name||"").trim(),role:String(p.role||""),crm:String(p.crm||"").trim(),college:String(p.college||"").trim(),state:String(p.state||""),phone:String(p.phone||"").replace(/\D/g,""),emailNotifications:p.emailNotifications===true,whatsappNotifications:p.whatsappNotifications===true};
 if(profile.name.length<3||profile.name.length>100) throw new Error("Informe seu nome completo.");
 if(!states.includes(profile.state)) throw new Error("Selecione um estado.");
 if(!["doctor","student"].includes(profile.role)) throw new Error("Selecione médico ou estudante.");
 if(profile.role==="doctor"&&!/^\d{3,8}$/.test(profile.crm)) throw new Error("Informe um CRM válido, somente números.");
 if(profile.role==="student"&&(profile.college.length<3||profile.college.length>160)) throw new Error("Informe o nome da faculdade.");
 if(profile.phone&&!/^(55)?\d{10,11}$/.test(profile.phone)) throw new Error("Informe um telefone com DDD.");
 if(profile.whatsappNotifications&&!profile.phone) throw new Error("Informe seu WhatsApp para autorizar notificações.");
 if(profile.role==="doctor") profile.college=""; else profile.crm="";
 return profile;
}
export function adminProfileInput(p:Record<string,unknown>) {
 const profile={name:String(p.name||"").trim(),role:"admin",crm:"",college:"",state:"",phone:String(p.phone||"").replace(/\D/g,""),emailNotifications:p.emailNotifications===true,whatsappNotifications:p.whatsappNotifications===true};
 if(profile.name.length<3||profile.name.length>100) throw new Error("Informe seu nome completo.");
 if(profile.phone&&!/^(55)?\d{10,11}$/.test(profile.phone)) throw new Error("Informe um telefone com DDD.");
 if(profile.whatsappNotifications&&!profile.phone) throw new Error("Informe seu WhatsApp para autorizar notificações.");
 return profile;
}
export async function rateLimit(req:Request,action:string,max:number) {
 const db=settings().DB; const key=await digest(action+":"+(req.headers.get("cf-connecting-ip")||"local")); const now=Date.now();
 await db.prepare("DELETE FROM request_limits WHERE expires < ?").bind(now).run();
 const row=await db.prepare("INSERT INTO request_limits(key,count,expires) VALUES(?,1,?) ON CONFLICT(key) DO UPDATE SET count=count+1 RETURNING count").bind(key,now+3600000).first<{count:number}>();return (row?.count||0)<=max;
}
export async function currentUser(req:Request) {
 const token=req.headers.get("cookie")?.match(/(?:^|;\s*)em_session=([a-f0-9]{64})(?:;|$)/)?.[1];if(!token)return null;
 const row=await settings().DB.prepare("SELECT users.id,users.email,users.profile FROM sessions JOIN users ON users.id=sessions.user_id WHERE sessions.digest=? AND sessions.expires>?").bind(await digest(token),Date.now()).first<{id:string;email:string;profile:string}>();return row?{id:row.id,email:row.email,...JSON.parse(row.profile)}:null;
}
export async function currentSession(req:Request) {
 const token=req.headers.get("cookie")?.match(/(?:^|;\s*)em_session=([a-f0-9]{64})(?:;|$)/)?.[1];if(!token)return null;
 const sessionDigest=await digest(token);const row=await settings().DB.prepare("SELECT user_id,expires FROM sessions WHERE digest=? AND expires>?").bind(sessionDigest,Date.now()).first<{user_id:string;expires:number}>();return row?{digest:sessionDigest,userId:row.user_id,expires:row.expires}:null;
}
export function sessionCookie(token:string,req:Request,clear=false) { return `em_session=${token}; HttpOnly; SameSite=Lax; Path=/; Max-Age=${clear?0:604800}${new URL(req.url).protocol==="https:"?"; Secure":""}`; }
