export const ACCESS_BLOCKED = "O acesso foi interrompido antes dos dados. Entre de novo e tente outra vez.";

export function responseIsBlocked(contentType: string | null, redirected: boolean) {
  return redirected || !(contentType || "").toLowerCase().includes("application/json");
}
