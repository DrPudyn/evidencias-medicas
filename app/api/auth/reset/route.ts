import { body, digest, json, randomToken, rateLimit, sameOrigin, settings } from "@/lib/server";
import { ADMIN_EMAIL, normalizeEmail, validEmail } from "@/lib/auth-identity";
import { mailReady, sendAccountLink } from "@/lib/mail";
import { hashPassword, validPassword } from "@/lib/password";

const NOTICE = "Se o endereço puder receber acesso, enviaremos um link para definir sua senha.";
export async function POST(req: Request) {
  if (!sameOrigin(req)) return json({ error: "Origem não autorizada." }, 403);
  try {
    if (!await rateLimit(req, "password-reset", 10)) return json({ error: "Limite de tentativas atingido. Tente novamente mais tarde." }, 429);
    const input = await body(req), db = settings().DB, now = Date.now();
    if (input.token !== undefined) {
      if (typeof input.token !== "string" || !/^[a-f0-9]{64}$/.test(input.token) || !validPassword(input.password))
        return json({ error: "Link inválido ou senha fora do limite de 12 a 128 caracteres." }, 400);
      const tokenDigest = await digest(input.token);
      const reset = await db.prepare("SELECT email FROM password_resets WHERE digest=? AND expires>?").bind(tokenDigest,now).first<{email:string}>();
      if (!reset) return json({ error: "Link inválido ou expirado. Solicite outro." }, 400);
      const encoded = await hashPassword(input.password);
      const statements = [];
      if (reset.email === ADMIN_EMAIL) {
        statements.push(db.prepare("INSERT OR IGNORE INTO users(id,email,profile,created_at) SELECT ?,email,?,? FROM password_resets WHERE digest=? AND expires>?")
          .bind(crypto.randomUUID(),JSON.stringify({role:"admin"}),now,tokenDigest,now));
      }
      statements.push(
        db.prepare("UPDATE users SET password_hash=?,email_verified_at=? WHERE email=(SELECT email FROM password_resets WHERE digest=? AND expires>?)").bind(encoded,now,tokenDigest,now),
        db.prepare("DELETE FROM admin_sessions WHERE user_id IN (SELECT id FROM users WHERE email=(SELECT email FROM password_resets WHERE digest=? AND expires>?))").bind(tokenDigest,now),
        db.prepare("DELETE FROM webauthn_challenges WHERE user_id IN (SELECT id FROM users WHERE email=(SELECT email FROM password_resets WHERE digest=? AND expires>?))").bind(tokenDigest,now),
        db.prepare("DELETE FROM sessions WHERE user_id IN (SELECT id FROM users WHERE email=(SELECT email FROM password_resets WHERE digest=? AND expires>?))").bind(tokenDigest,now),
        db.prepare("DELETE FROM password_resets WHERE email=(SELECT email FROM password_resets WHERE digest=? AND expires>?)").bind(tokenDigest,now)
      );
      const results = await db.batch(statements);
      if (!results[reset.email === ADMIN_EMAIL ? 1 : 0].meta.changes) return json({ error: "Link inválido ou expirado. Solicite outro." }, 400);
      return json({ok:true,email:reset.email});
    }
    const email = normalizeEmail(input.email);
    if (!validEmail(email)) return json({ error: "Informe um e-mail válido." }, 400);
    
    if (!mailReady(req)) return json({ error: "Recuperação por e-mail temporariamente indisponível." }, 503);
    const user = await db.prepare("SELECT id FROM users WHERE email=?").bind(email).first();
    if (!user && email !== ADMIN_EMAIL) return json({message:NOTICE});
    const token = randomToken(), tokenDigest = await digest(token);
    const lang = input.lang === "en" ? "en" : "pt";
    await db.batch([
      db.prepare("DELETE FROM password_resets WHERE email=? OR expires<?").bind(email,now),
      db.prepare("INSERT INTO password_resets(digest,email,expires) VALUES(?,?,?)").bind(tokenDigest,email,now+1800000)
    ]);
    try{
      const sent=await sendAccountLink(req,email,lang,"reset",token,email===ADMIN_EMAIL);
      if(sent.previewUrl)return json({message:NOTICE,previewResetUrl:sent.previewUrl});
    }catch{
      await db.prepare("DELETE FROM password_resets WHERE digest=?").bind(tokenDigest).run();
      return json({error:"Não foi possível enviar o e-mail. Tente novamente."},502);
    }
    return json({message:NOTICE});
  } catch {
    return json({ error: "Não foi possível concluir a recuperação. Tente novamente." }, 500);
  }
}
