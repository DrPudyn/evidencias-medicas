import { DEFAULT_SITE_ORIGIN } from "./brand";

function normalizeOrigin(raw: string | undefined): string {
  if (!raw) return "";
  try {
    const url = new URL(raw.trim());
    if (url.protocol !== "https:" && url.protocol !== "http:") return "";
    return url.origin;
  } catch {
    return "";
  }
}

/** Origem pública do site. `SITE_ORIGIN` no ambiente; senão o workers.dev provisório. */
export function getSiteOrigin(): string {
  const fromEnv = typeof process !== "undefined" ? process.env.SITE_ORIGIN : "";
  return normalizeOrigin(fromEnv) || DEFAULT_SITE_ORIGIN;
}

export const SITE_ORIGIN = getSiteOrigin();
export function languagePath(locale: string) { return locale === "en" ? "/en" : "/pt"; }
