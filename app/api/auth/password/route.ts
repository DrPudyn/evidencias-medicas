import { body, digest, json, randomToken, rateLimit, sameOrigin, sessionCookie, settings } from "@/lib/server";
import { accountIdentity, ADMIN_EMAIL, normalizeEmail, validEmail } from "@/lib/auth-identity";
import { hashPassword, validPassword, verifyPassword } from "@/lib/password";
import { createAdminSession } from "@/lib/admin";

export async function POST(req: Request) {
  if (!sameOrigin(req)) return json({ error: "Origem não autorizada." }, 403);
  try {
    const input = await body(req), email = normalizeEmail(input.email);
    if (!validEmail(email) || !["register", "login"].includes(input.mode) || typeof input.password !== "string" || input.password.length > 128)
      return json({ error: "Informe um e-mail e uma senha válidos." }, 400);
    if (!await rateLimit(req, "password-ip", 60) || !await rateLimit(new Request(req.url, { headers: { "cf-connecting-ip": email } }), "password-account", 20))
      return json({ error: "Limite de tentativas atingido. Tente novamente mais tarde." }, 429);
    const db = settings().DB;
    let user = await db.prepare("SELECT id,email,password_hash,email_verified_at FROM users WHERE email=?").bind(email).first<{id:string;email:string;password_hash:string|null;email_verified_at:number|null}>();
    if (input.mode === "register") {
      if (!validPassword(input.password)) return json({ error: "Use uma senha de 12 a 128 caracteres." }, 400);
      if (email === ADMIN_EMAIL || user) return json({ error: "Não foi possível criar a conta. Entre ou use a recuperação de senha." }, 409);
      const encoded = await hashPassword(input.password), id = crypto.randomUUID(), now = Date.now();
      const created = await db.prepare("INSERT OR IGNORE INTO users(id,email,profile,created_at,password_hash,email_verified_at) VALUES(?,?,?,?,?,NULL)")
        .bind(id,email,JSON.stringify({role:"member"}),now,encoded).run();
      if (!created.meta.changes) return json({ error: "Não foi possível criar a conta. Entre ou use a recuperação de senha." },409);
      // Invalidate old confirmation links so they cannot replace this account.
      await db.prepare("DELETE FROM email_verifications WHERE email=?").bind(email).run();
      user = {id,email,password_hash:encoded,email_verified_at:null};
    } else if (!await verifyPassword(input.password, user?.password_hash ?? null) || !user) {
      return json({ error: "E-mail ou senha incorretos. Se ainda não tem senha, use a recuperação." }, 401);
    }
    if(email === ADMIN_EMAIL && !user?.email_verified_at)return json({error:"Confirme seu e-mail pela recuperação de acesso antes de entrar."},403);
    const token = randomToken(), tokenDigest = await digest(token), now = Date.now();
    await db.prepare("INSERT INTO sessions(digest,user_id,expires,created_at,last_seen_at,auth_method) VALUES(?,?,?,?,?,?)").bind(tokenDigest,user!.id,now+604800000,now,now,"password").run();
    const headers = new Headers();
    headers.append("Set-Cookie", sessionCookie(token, req));
    if (email === ADMIN_EMAIL) headers.append("Set-Cookie", await createAdminSession(user!.id, tokenDigest, req));
    return json({ user: accountIdentity(user!.id,email) }, 200, headers);
  } catch (error) {
    const message = error instanceof Error && (error.message.startsWith("Não foi possível") || error.message.startsWith("Use uma senha"))
      ? error.message.slice(0, 240)
      : "Não foi possível concluir o acesso. Tente novamente.";
    return json({ error: message }, 500);
  }
}
