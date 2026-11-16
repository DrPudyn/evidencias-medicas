import { generateAuthenticationOptions, generateRegistrationOptions, verifyAuthenticationResponse, verifyRegistrationResponse } from "@simplewebauthn/server";
import type { AuthenticationResponseJSON, RegistrationResponseJSON } from "@simplewebauthn/server";
import { relyingParty } from "@/lib/account-access";
import { BRAND_NAME } from "@/lib/brand";
import { digest, randomToken, sessionCookie, settings } from "@/lib/server";

export function passkeyContext(req: Request) {
  return relyingParty(new URL(req.url).origin, settings().SITE_ORIGIN || "");
}

function bytesToBase64(bytes: Uint8Array) {
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary);
}

function base64ToBytes(value: string) {
  const binary = atob(value);
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) bytes[index] = binary.charCodeAt(index);
  return bytes;
}

async function saveChallenge(kind: string, challenge: string, userId: string | null, payload: string) {
  const db = settings().DB;
  const id = crypto.randomUUID();
  const now = Date.now();
  await db.prepare("DELETE FROM passkey_challenges WHERE expires_at<?").bind(now).run();
  await db.prepare("INSERT INTO passkey_challenges(id,user_id,kind,challenge,payload,expires_at) VALUES(?,?,?,?,?,?)").bind(id, userId, kind, challenge, payload, now + 180000).run();
  return id;
}

async function consumeChallenge(id: string, kind: string) {
  const now = Date.now();
  return settings().DB.prepare("DELETE FROM passkey_challenges WHERE id=? AND kind=? AND expires_at>? RETURNING user_id,challenge,payload").bind(id, kind, now).first<{ user_id: string | null; challenge: string; payload: string }>();
}

export async function registrationOptions(req: Request, displayName: string, userId: string | null) {
  const name = displayName.trim().slice(0, 80);
  if (name.length < 2) throw new Error("Informe um nome de exibição.");
  const { rpID } = passkeyContext(req);
  const id = userId || crypto.randomUUID();
  const existing = userId
    ? await settings().DB.prepare("SELECT credential_id,transports FROM user_passkeys WHERE user_id=?").bind(userId).all<{ credential_id: string; transports: string }>()
    : { results: [] as { credential_id: string; transports: string }[] };
  const options = await generateRegistrationOptions({
    rpName: BRAND_NAME,
    rpID,
    userName: name,
    userDisplayName: name,
    userID: new TextEncoder().encode(id),
    attestationType: "none",
    authenticatorSelection: { residentKey: "required", userVerification: "preferred" },
    excludeCredentials: existing.results.map((item) => ({ id: item.credential_id, transports: JSON.parse(item.transports) })),
  });
  const challengeId = await saveChallenge(userId ? "add" : "register", options.challenge, id, JSON.stringify({ name }));
  return { options, challengeId };
}

async function openSession(userId: string, req: Request) {
  const token = randomToken();
  const now = Date.now();
  await settings().DB.prepare("INSERT INTO sessions(digest,user_id,expires,created_at,last_seen_at,auth_method) VALUES(?,?,?,?,?,?)").bind(await digest(token), userId, now + 604800000, now, now, "passkey").run();
  return sessionCookie(token, req);
}

export async function finishRegistration(req: Request, challengeId: string, response: RegistrationResponseJSON, existingUserId: string | null) {
  const row = await consumeChallenge(challengeId, existingUserId ? "add" : "register");
  if (!row) throw new Error("A chave expirou. Comece de novo.");
  if (existingUserId && row.user_id !== existingUserId) throw new Error("A chave não pertence a esta conta.");
  const { origin, rpID } = passkeyContext(req);
  const verified = await verifyRegistrationResponse({ response, expectedChallenge: row.challenge, expectedOrigin: origin, expectedRPID: rpID, requireUserVerification: true });
  if (!verified.verified) throw new Error("A chave não foi verificada.");
  const credential = verified.registrationInfo.credential;
  const db = settings().DB;
  const now = Date.now();
  const userId = existingUserId || row.user_id || crypto.randomUUID();
  if (!existingUserId) {
    const payload = JSON.parse(row.payload || "{}") as { name?: string };
    const name = (payload.name || "Leitor").slice(0, 80);
    const email = `passkey+${userId}@users.buscaevidencia.invalid`;
    await db.prepare("INSERT INTO users(id,email,profile,created_at,password_hash,email_verified_at) VALUES(?,?,?,?,NULL,NULL)").bind(userId, email, JSON.stringify({ role: "member", name, theme: "light" }), now).run();
  }
  await db.prepare("INSERT INTO user_passkeys(credential_id,user_id,public_key,counter,transports,created_at) VALUES(?,?,?,?,?,?)").bind(credential.id, userId, bytesToBase64(credential.publicKey), credential.counter, JSON.stringify(credential.transports || []), now).run();
  if (existingUserId) return { userId, cookie: "" };
  return { userId, cookie: await openSession(userId, req) };
}

export async function authenticationOptions(req: Request) {
  const { rpID } = passkeyContext(req);
  const options = await generateAuthenticationOptions({ rpID, userVerification: "preferred" });
  const challengeId = await saveChallenge("login", options.challenge, null, "{}");
  return { options, challengeId };
}

export async function finishAuthentication(req: Request, challengeId: string, response: AuthenticationResponseJSON) {
  const row = await consumeChallenge(challengeId, "login");
  if (!row) throw new Error("A chave expirou. Comece de novo.");
  const db = settings().DB;
  const credential = await db.prepare("SELECT credential_id,user_id,public_key,counter,transports FROM user_passkeys WHERE credential_id=?").bind(response.id).first<{ credential_id: string; user_id: string; public_key: string; counter: number; transports: string }>();
  if (!credential) throw new Error("Chave não reconhecida.");
  const { origin, rpID } = passkeyContext(req);
  const verified = await verifyAuthenticationResponse({
    response,
    expectedChallenge: row.challenge,
    expectedOrigin: origin,
    expectedRPID: rpID,
    requireUserVerification: true,
    credential: { id: credential.credential_id, publicKey: base64ToBytes(credential.public_key), counter: credential.counter, transports: JSON.parse(credential.transports) },
  });
  if (!verified.verified) throw new Error("A chave não foi verificada.");
  await db.prepare("UPDATE user_passkeys SET counter=?,last_used_at=? WHERE credential_id=?").bind(verified.authenticationInfo.newCounter, Date.now(), credential.credential_id).run();
  return openSession(credential.user_id, req);
}
