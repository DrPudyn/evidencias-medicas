import { safeNext } from "@/lib/safe-next";
import { digest, sameOrigin, sessionCookie, settings } from "@/lib/server";

export async function POST(req: Request) {
  const form = await req.formData().catch(() => null);
  const lang = form?.get("lang") === "en" ? "en" : "pt";
  const next = safeNext(form?.get("next"), lang === "en" ? "/en" : "/pt");
  if (!sameOrigin(req)) return Response.redirect(new URL(next, req.url), 303);
  const token = req.headers.get("cookie")?.match(/(?:^|;\s*)em_session=([a-f0-9]{64})(?:;|$)/)?.[1];
  if (token) await settings().DB.prepare("DELETE FROM sessions WHERE digest=?").bind(await digest(token)).run().catch(() => undefined);
  const headers = new Headers({ Location: next, "Cache-Control": "private, no-store" });
  headers.append("Set-Cookie", sessionCookie("", req, true));
  headers.append("Set-Cookie", "admin_session=; HttpOnly; SameSite=Lax; Path=/; Max-Age=0");
  return new Response(null, { status: 303, headers });
}
