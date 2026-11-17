/** Keeps a post-login return path on this site. */
export function safeNext(value: unknown, fallback = "/pt") {
  if (typeof value !== "string" || !value.startsWith("/") || value.startsWith("//") || value.includes("\\") || value.includes("://")) return fallback;
  return value.slice(0, 400);
}
