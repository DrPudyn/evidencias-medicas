import { ADMIN_EMAIL, normalizeEmail, validEmail } from "@/lib/auth-identity";
import { hashPassword, validPassword, verifyPassword } from "@/lib/password";
import { safeNext } from "@/lib/safe-next";
import { digest, randomToken, rateLimit, sameOrigin, sessionCookie, settings } from "@/lib/server";
import { createAdminSession } from "@/lib/admin";

function redirectTo(location: string, cookie?: string) {
  const headers = new Headers({ Location: location, "Cache-Control": "private, no-store" });
  if (cookie) headers.append("Set-Cookie", cookie);
  return new Response(null, { status: 303, headers });
}

function accessError(error: unknown) {
  const message = error instanceof Error ? error.message : "";
  if (message.startsWith("Use uma senha") || message.startsWith("Não foi possível")) return message.slice(0, 240);
  if (/no such column|no such table/i.test(message)) return "Não foi possível gravar a conta. A base não tem um campo esperado.";
  return "Não foi possível concluir o acesso. Tente novamente.";
}

function back(mode: string, lang: string, next: string, message: string) {
  const path = lang === "en" ? (mode === "register" ? "/en/register" : "/en/entrar") : (mode === "register" ? "/pt/cadastro" : "/pt/entrar");
  const url = new URL(path, "https://local");
  url.searchParams.set("erro", message);
  url.searchParams.set("next", next);
  return redirectTo(`${url.pathname}${url.search}`);
}

export async function POST(req: Request) {
  const form = await req.formData().catch(() => null);
  const lang = form?.get("lang") === "en" ? "en" : "pt";
  const mode = form?.get("mode") === "register" ? "register" : "login";
  const next = safeNext(form?.get("next"), lang === "en" ? "/en" : "/pt");
  if (!form || !sameOrigin(req)) return back(mode, lang, next, "Origem não autorizada.");
  const email = normalizeEmail(form.get("email"));
  const password = String(form.get("password") ?? "");
  const confirmation = String(form.get("confirmation") ?? "");
  if (!validEmail(email) || password.length > 128) return back(mode, lang, next, "Informe um e-mail e uma senha válidos.");
  try {
    if (!await rateLimit(req, "password-ip", 60) || !await rateLimit(new Request(req.url, { headers: { "cf-connecting-ip": email } }), "password-account", 20)) {
      return back(mode, lang, next, "Limite de tentativas atingido. Tente novamente mais tarde.");
    }
    const db = settings().DB;
    let user = await db.prepare("SELECT id,email,password_hash,email_verified_at FROM users WHERE email=?").bind(email).first<{ id: string; email: string; password_hash: string | null; email_verified_at: number | null }>();
    if (mode === "register") {
      if (!validPassword(password)) return back(mode, lang, next, "Use uma senha de 12 a 128 caracteres.");
      if (password !== confirmation) return back(mode, lang, next, "A confirmação da senha não confere.");
      if (email === ADMIN_EMAIL || user) return back(mode, lang, next, "Não foi possível criar a conta. Entre ou use a recuperação de senha.");
      const encoded = await hashPassword(password);
      const id = crypto.randomUUID();
      const now = Date.now();
      const created = await db.prepare("INSERT OR IGNORE INTO users(id,email,profile,created_at,password_hash,email_verified_at) VALUES(?,?,?,?,?,?)")
        .bind(id, email, JSON.stringify({ role: "member" }), now, encoded, now).run();
      if (!created.meta.changes) return back(mode, lang, next, "Não foi possível criar a conta. Entre ou use a recuperação de senha.");
      user = { id, email, password_hash: encoded, email_verified_at: now };
    } else if (!await verifyPassword(password, user?.password_hash ?? null) || !user) {
      return back(mode, lang, next, "E-mail ou senha incorretos.");
    }
    if (email === ADMIN_EMAIL && !user?.email_verified_at) return back(mode, lang, next, "Confirme seu e-mail pela recuperação de acesso antes de entrar.");
    const token = randomToken();
    const tokenDigest = await digest(token);
    const now = Date.now();
    await db.prepare("INSERT INTO sessions(digest,user_id,expires,created_at,last_seen_at,auth_method) VALUES(?,?,?,?,?,?)").bind(tokenDigest, user!.id, now + 604800000, now, now, "password").run();
    const headers = new Headers({ Location: next, "Cache-Control": "private, no-store" });
    headers.append("Set-Cookie", sessionCookie(token, req));
    if (email === ADMIN_EMAIL) headers.append("Set-Cookie", await createAdminSession(user!.id, tokenDigest, req));
    return new Response(null, { status: 303, headers });
  } catch (error) {
    return back(mode, lang, next, accessError(error));
  }
}
