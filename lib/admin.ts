import { generateAuthenticationOptions, generateRegistrationOptions, verifyAuthenticationResponse, verifyRegistrationResponse } from "@simplewebauthn/server";
import type { AuthenticationResponseJSON, RegistrationResponseJSON } from "@simplewebauthn/server";
import { currentSession, digest, localPreview, randomToken, settings } from "@/lib/server";

const ADMIN_EMAIL = "evidenciasmedicas@outlook.com";
const ADMIN_TTL = 15 * 60 * 1000;
export function allowedEmails() { return (settings().ADMIN_EMAILS || "").split(",").map((x) => x.trim().toLowerCase()).filter(Boolean); }
export function isAdminEmail(email: string) { return allowedEmails().includes(email.trim().toLowerCase()) && email.trim().toLowerCase() === ADMIN_EMAIL; }
export function webauthnContext(req: Request) {
  const url = new URL(req.url);
  if (localPreview(req)) {
    if (url.hostname !== "localhost") throw new Error("Para cadastrar a chave na prévia local, abra http://localhost:5173/admin. O endereço 127.0.0.1 usa outra origem de segurança.");
    return { origin: url.origin, rpID: "localhost" };
  }
  const origin = settings().ADMIN_ORIGIN || url.origin; const rpID = settings().ADMIN_RP_ID || url.hostname;
  if (origin !== url.origin || new URL(origin).hostname !== rpID) throw new Error("Origem de segurança não configurada.");
  return { origin, rpID };
}
export async function userForSession(req: Request) {
  const session = await currentSession(req); if (!session) return null;
  const user = await settings().DB.prepare("SELECT id,email FROM users WHERE id=?").bind(session.userId).first<{id:string;email:string}>();
  return user && isAdminEmail(user.email) ? { ...user, session } : null;
}
export async function audit(action: string, outcome: string, userId?: string, target?: string) {
  await settings().DB.prepare("INSERT INTO admin_audit_log(id,actor_user_id,action,outcome,target_id,created_at) VALUES(?,?,?,?,?,?)").bind(crypto.randomUUID(),userId||null,action.slice(0,80),outcome.slice(0,40),target?.slice(0,100)||null,Date.now()).run();
}
export async function createAdminSession(userId: string, baseSessionDigest: string, req: Request) {
  const token = randomToken(), now = Date.now();
  await settings().DB.prepare("INSERT INTO admin_sessions(digest,user_id,base_session_digest,created_at,last_seen_at,expires) VALUES(?,?,?,?,?,?)").bind(await digest(token),userId,baseSessionDigest,now,now,now+ADMIN_TTL).run();
  await audit("admin_session_created","success",userId);
  return `admin_session=${token}; HttpOnly; SameSite=Strict; Path=/; Max-Age=900${new URL(req.url).protocol === "https:" ? "; Secure" : ""}`;
}
export async function requireAdmin(req: Request) {
  const identity = await userForSession(req); if (!identity) return null;
  const token = req.headers.get("cookie")?.match(/(?:^|;\s*)admin_session=([a-f0-9]{64})(?:;|$)/)?.[1]; if (!token) return null;
  const now=Date.now(), digestValue=await digest(token);
  const row=await settings().DB.prepare("SELECT digest FROM admin_sessions WHERE digest=? AND user_id=? AND base_session_digest=? AND expires>? AND revoked_at IS NULL").bind(digestValue,identity.id,identity.session.digest,now).first();
  if (!row) return null;
  await settings().DB.prepare("UPDATE admin_sessions SET last_seen_at=? WHERE digest=?").bind(now,digestValue).run();
  return identity;
}
export async function saveChallenge(userId: string, sessionDigest: string, kind: string, challenge: string) {
  const db=settings().DB,now=Date.now(),id=crypto.randomUUID();
  await db.prepare("DELETE FROM webauthn_challenges WHERE expires_at<?").bind(now).run();
  await db.prepare("INSERT INTO webauthn_challenges(id,user_id,base_session_digest,kind,challenge,expires_at,created_at) VALUES(?,?,?,?,?,?,?)").bind(id,userId,sessionDigest,kind,challenge,now+180000,now).run(); return id;
}
export async function consumeChallenge(id: string, userId: string, sessionDigest: string, kind: string) {
  const db=settings().DB,now=Date.now();
  return db.prepare("DELETE FROM webauthn_challenges WHERE id=? AND user_id=? AND base_session_digest=? AND kind=? AND expires_at>? RETURNING challenge").bind(id,userId,sessionDigest,kind,now).first<{challenge:string}>();
}
export async function registrationOptions(req: Request, user: {id:string;email:string;session:{digest:string}}, bootstrap: boolean) {
  const {rpID}=webauthnContext(req),db=settings().DB;
  const existing=await db.prepare("SELECT credential_id,transports FROM admin_credentials WHERE user_id=?").bind(user.id).all<{credential_id:string;transports:string}>();
  const options=await generateRegistrationOptions({rpName:"Evidências Médicas · Administração",rpID,userName:user.email,userDisplayName:"Administrador Evidências Médicas",userID:new TextEncoder().encode(user.id),attestationType:"none",authenticatorSelection:{authenticatorAttachment:"cross-platform",residentKey:"discouraged",userVerification:"discouraged"},excludeCredentials:existing.results.map(c=>({id:c.credential_id,transports:JSON.parse(c.transports)})),preferredAuthenticatorType:"securityKey"});
  const id=await saveChallenge(user.id,user.session.digest,bootstrap?"bootstrap-register":"register",options.challenge);return {options,challengeId:id};
}
export async function finishRegistration(req: Request, user: {id:string;email:string;session:{digest:string}}, challengeId: string, response: RegistrationResponseJSON, bootstrap: boolean) {
  const row=await consumeChallenge(challengeId,user.id,user.session.digest,bootstrap?"bootstrap-register":"register");if(!row)throw new Error("Cerimônia expirada ou já utilizada.");
  const {origin,rpID}=webauthnContext(req);
  const result=await verifyRegistrationResponse({response,expectedChallenge:row.challenge,expectedOrigin:origin,expectedRPID:rpID,requireUserPresence:true,requireUserVerification:false});
  if(!result.verified)throw new Error("A chave não foi verificada.");
  const c=result.registrationInfo.credential,db=settings().DB,now=Date.now();
  if(bootstrap){const used=await db.prepare("SELECT singleton_id FROM admin_bootstrap_state WHERE singleton_id=1").first();if(used)throw new Error("Configuração inicial já foi concluída.");}
  await db.prepare("INSERT INTO admin_credentials(credential_id,user_id,public_key,counter,transports,backup_eligible,backup_state,created_at) VALUES(?,?,?,?,?,?,?,?)").bind(c.id,user.id,Array.from(c.publicKey).join(","),c.counter,JSON.stringify(c.transports||[]),result.registrationInfo.credentialDeviceType==="multiDevice"?1:0,result.registrationInfo.credentialBackedUp?1:0,now).run();
  if(bootstrap)await db.prepare("INSERT INTO admin_bootstrap_state(singleton_id,completion_challenge_id,completed_at) VALUES(1,?,?)").bind(challengeId,now).run();
  await audit(bootstrap?"webauthn_bootstrap_registered":"webauthn_credential_added","success",user.id,await digest(c.id));return true;
}
export async function authenticationOptions(req: Request, user: {id:string;email:string;session:{digest:string}}) {
  const {rpID}=webauthnContext(req),rows=await settings().DB.prepare("SELECT credential_id,transports FROM admin_credentials WHERE user_id=?").bind(user.id).all<{credential_id:string;transports:string}>();
  if(!rows.results.length)throw new Error("Chave de segurança ainda não cadastrada.");
  const options=await generateAuthenticationOptions({rpID,allowCredentials:rows.results.map(c=>({id:c.credential_id,transports:JSON.parse(c.transports)})),userVerification:"discouraged"});
  const id=await saveChallenge(user.id,user.session.digest,"authenticate",options.challenge);return {options,challengeId:id};
}
export async function finishAuthentication(req: Request,user: {id:string;email:string;session:{digest:string}},challengeId: string,response: AuthenticationResponseJSON) {
  const row=await consumeChallenge(challengeId,user.id,user.session.digest,"authenticate");if(!row)throw new Error("Cerimônia expirada ou já utilizada.");
  const db=settings().DB,credential=await db.prepare("SELECT credential_id,public_key,counter,transports FROM admin_credentials WHERE user_id=? AND credential_id=?").bind(user.id,response.id).first<{credential_id:string;public_key:string;counter:number;transports:string}>();if(!credential)throw new Error("Chave não reconhecida.");
  const {origin,rpID}=webauthnContext(req),verified=await verifyAuthenticationResponse({response,expectedChallenge:row.challenge,expectedOrigin:origin,expectedRPID:rpID,requireUserVerification:false,credential:{id:credential.credential_id,publicKey:new Uint8Array(credential.public_key.split(",").map(Number)),counter:credential.counter,transports:JSON.parse(credential.transports)}});
  if(!verified.verified)throw new Error("A chave não foi verificada.");const now=Date.now(),a=verified.authenticationInfo;
  await db.prepare("UPDATE admin_credentials SET counter=?,last_used_at=?,backup_state=? WHERE credential_id=?").bind(a.newCounter,now,a.credentialBackedUp?1:0,credential.credential_id).run();
  await audit("webauthn_authenticated","success",user.id,await digest(credential.credential_id));return createAdminSession(user.id,user.session.digest,req);
}
export const adminTtl=ADMIN_TTL;
