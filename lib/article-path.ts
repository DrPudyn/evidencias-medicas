export function articlePath(lang: "pt" | "en", id: string) {
  return `/${lang}/artigo/${encodeURIComponent(id)}`;
}

export function savedSections(value: unknown) {
  if (!Array.isArray(value)) return undefined;
  const sections = value.slice(0, 12).flatMap((item) => {
    if (!item || typeof item !== "object") return [];
    const record = item as { label?: unknown; text?: unknown };
    const text = typeof record.text === "string" ? record.text.trim().slice(0, 4000) : "";
    if (!text) return [];
    const label = typeof record.label === "string" && record.label.trim() ? record.label.trim().slice(0, 80) : "Resumo";
    return [{ label, text }];
  });
  return sections.length ? sections : undefined;
}

export function savedAbstract(value: unknown) {
  if (typeof value !== "string") return undefined;
  const text = value.trim().slice(0, 12000);
  return text || undefined;
}
