export type Locale = "pt" | "en";

export function resolveLocale(requested: string | null, saved: string | null, browserLanguage: string): Locale {
  if (requested === "en" || requested === "pt") return requested;
  if (saved === "en" || saved === "pt") return saved;
  return browserLanguage.toLowerCase().startsWith("pt") ? "pt" : "en";
}
