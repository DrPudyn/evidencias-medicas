import { env } from "cloudflare:workers";
import { accountIdentity } from "./auth-identity";
export const settings = () => env as unknown as {
  DB: D1Database;
  AI?: { run: (model: string, input: Record<string, unknown>) => Promise<unknown> };
  LOCAL_PREVIEW_ENABLED?: string;
  RESEND_API_KEY?: string;
  EMAIL_FROM?: string;
  NCBI_CONTACT_EMAIL?: string;
  NCBI_API_KEY?: string;
  ADMIN_EMAILS?: string;
  ADMIN_BOOTSTRAP_ENABLED?: string;
  ADMIN_RP_ID?: string;
  ADMIN_ORIGIN?: string;
  SITE_ORIGIN?: string;
  PLAN_PRICE_LABEL?: string;
  WORKERS_AI_MODEL?: string;
  CLINICAL_AI_PROVIDER?: string;
  STRIPE_SECRET_KEY?: string;
  STRIPE_WEBHOOK_SECRET?: string;
  STRIPE_PRICE_ID?: string;
};
export function json(data:unknown,status=200,headers:HeadersInit={}) { const values=new Headers(headers);values.set("Cache-Control","no-store");return Response.json(data,{status,headers:values}); }
export const digest = async (value:string) => Array.from(new Uint8Array(await crypto.subtle.digest("SHA-256",new TextEncoder().encode(value)))).map(x=>x.toString(16).padStart(2,"0")).join("");
export const randomToken = () => Array.from(crypto.getRandomValues(new Uint8Array(32))).map(x=>x.toString(16).padStart(2,"0")).join("");
export function localPreview(req:Request) { return ["127.0.0.1","localhost","[::1]"].includes(new URL(req.url).hostname) && (process.env.NODE_ENV === "development" || settings().LOCAL_PREVIEW_ENABLED === "true"); }
export function sameOrigin(req:Request) { return req.headers.get("origin") === new URL(req.url).origin; }
export async function body(req:Request,maxLength=16000) { const raw=await req.text(); if(raw.length>maxLength) throw new Error("Solicitação muito grande."); return JSON.parse(raw); }
export async function rateLimit(req:Request,action:string,max:number) {
 const db=settings().DB; const key=await digest(action+":"+(req.headers.get("cf-connecting-ip")||"local")); const now=Date.now();
 await db.prepare("DELETE FROM request_limits WHERE expires < ?").bind(now).run();
 const row=await db.prepare("INSERT INTO request_limits(key,count,expires) VALUES(?,1,?) ON CONFLICT(key) DO UPDATE SET count=count+1 RETURNING count").bind(key,now+3600000).first<{count:number}>();return (row?.count||0)<=max;
}
export async function currentUser(req:Request) {
 const token=req.headers.get("cookie")?.match(/(?:^|;\s*)em_session=([a-f0-9]{64})(?:;|$)/)?.[1];if(!token)return null;
 const row=await settings().DB.prepare("SELECT users.id,users.email,users.profile FROM sessions JOIN users ON users.id=sessions.user_id WHERE sessions.auth_method='password' AND sessions.digest=? AND sessions.expires>?").bind(await digest(token),Date.now()).first<{id:string;email:string;profile:string}>();return row?accountIdentity(row.id,row.email):null;
}
export async function currentSession(req:Request) {
 const token=req.headers.get("cookie")?.match(/(?:^|;\s*)em_session=([a-f0-9]{64})(?:;|$)/)?.[1];if(!token)return null;
 const sessionDigest=await digest(token);const row=await settings().DB.prepare("SELECT user_id,expires FROM sessions WHERE auth_method='password' AND digest=? AND expires>?").bind(sessionDigest,Date.now()).first<{user_id:string;expires:number}>();return row?{digest:sessionDigest,userId:row.user_id,expires:row.expires}:null;
}
export function sessionCookie(token:string,req:Request,clear=false) { return `em_session=${token}; HttpOnly; SameSite=Lax; Path=/; Max-Age=${clear?0:604800}${new URL(req.url).protocol==="https:"?"; Secure":""}`; }
