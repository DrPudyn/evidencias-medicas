import type { AuthenticationResponseJSON, RegistrationResponseJSON } from "@simplewebauthn/server";
import { currentUser, json, rateLimit, sameOrigin, settings } from "@/lib/server";
import { authenticationOptions, finishAuthentication, finishRegistration, registrationOptions } from "@/lib/user-passkeys";

export async function POST(req: Request) {
  if (!sameOrigin(req)) return json({ error: "Origem não autorizada." }, 403);
  if (!await rateLimit(req, "passkey", 30)) return json({ error: "Limite de tentativas atingido. Tente novamente mais tarde." }, 429);
  try {
    const input = await req.json() as { action?: string; name?: string; challengeId?: string; response?: RegistrationResponseJSON | AuthenticationResponseJSON };
    const user = await currentUser(req);
    if (input.action === "register-options") {
      const name = user?.name || String(input.name || "");
      const result = await registrationOptions(req, name, user?.id || null);
      return json(result);
    }
    if (input.action === "register-verify") {
      const done = await finishRegistration(req, String(input.challengeId || ""), input.response as RegistrationResponseJSON, user?.id || null);
      const headers = new Headers();
      if (done.cookie) headers.append("Set-Cookie", done.cookie);
      return json({ ok: true }, 200, headers);
    }
    if (input.action === "login-options") return json(await authenticationOptions(req));
    if (input.action === "login-verify") {
      const cookie = await finishAuthentication(req, String(input.challengeId || ""), input.response as AuthenticationResponseJSON);
      const headers = new Headers();
      headers.append("Set-Cookie", cookie);
      return json({ ok: true }, 200, headers);
    }
    if (input.action === "list") {
      if (!user?.id) return json({ error: "Entre para ver suas chaves." }, 401);
      const rows = await settings().DB.prepare("SELECT credential_id,created_at,last_used_at FROM user_passkeys WHERE user_id=? ORDER BY created_at DESC").bind(user.id).all<{ credential_id: string; created_at: number; last_used_at: number | null }>();
      return json({ keys: rows.results.map((row) => ({ id: row.credential_id, createdAt: row.created_at, lastUsedAt: row.last_used_at })) });
    }
    if (input.action === "remove") {
      if (!user?.id) return json({ error: "Entre para continuar." }, 401);
      await settings().DB.prepare("DELETE FROM user_passkeys WHERE user_id=? AND credential_id=?").bind(user.id, String(input.challengeId || "")).run();
      return json({ ok: true });
    }
    return json({ error: "Ação inválida." }, 400);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Não foi possível usar a chave de acesso.";
    return json({ error: message.slice(0, 180) }, 400);
  }
}
