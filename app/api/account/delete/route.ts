import { body, currentUser, json, sameOrigin, sessionCookie, settings } from "@/lib/server";
import { isAdminEmail } from "@/lib/admin";

export async function DELETE(req: Request) {
  if (!sameOrigin(req)) return json({ error: "Origem não autorizada." }, 403);
  const user = await currentUser(req);
  if (!user) return json({ error: "Entre para continuar." }, 401);
  if (isAdminEmail(user.email)) {
    return json({ error: "A conta administrativa não pode ser removida por esta opção." }, 409);
  }
  try {
    const confirmation = await body(req);
    if (confirmation.confirmation !== "EXCLUIR MINHA CONTA") {
      return json({ error: "Confirme a exclusão da conta." }, 400);
    }
    const db = settings().DB;
    await db.batch([
      db.prepare("DELETE FROM saved_searches WHERE user_id=?").bind(user.id),
      db.prepare("DELETE FROM bookmarks WHERE user_id=?").bind(user.id),
      db.prepare("DELETE FROM sessions WHERE user_id=?").bind(user.id),
      db.prepare("DELETE FROM challenges WHERE email=?").bind(user.email),
      db.prepare("DELETE FROM password_resets WHERE email=?").bind(user.email),
      db.prepare("DELETE FROM users WHERE id=?").bind(user.id),
    ]);
    return json({ ok: true }, 200, { "Set-Cookie": sessionCookie("", req, true) });
  } catch {
    return json({ error: "Não foi possível excluir a conta." }, 500);
  }
}
