export const RESET_TTL_MS = 30 * 60 * 1000;
export const RESET_NOTICE = "Se o endereço puder receber acesso, enviaremos um link para definir sua senha.";

export function resetExpiry(now = Date.now()) {
  return now + RESET_TTL_MS;
}

function originOf(raw: string) {
  try {
    const url = new URL(raw.trim());
    if (url.protocol !== "https:" && url.protocol !== "http:") return "";
    return url.origin;
  } catch {
    return "";
  }
}

/** rpID follows the request host, or SITE_ORIGIN when it is the same host. */
export function relyingParty(requestOrigin: string, configuredOrigin = "") {
  const request = originOf(requestOrigin);
  const configured = originOf(configuredOrigin);
  const origin = configured && new URL(configured).hostname === new URL(request).hostname ? configured : request;
  return { origin, rpID: new URL(origin).hostname };
}
