export function prettyDate(value: string) {
  const raw = value.trim().replace(/\s+/g, " ");
  const yearOnly = raw.match(/^(\d{4})$/);
  if (yearOnly) return yearOnly[1];
  const monthOnly = raw.match(/^(\d{4})[\s/-]+([A-Za-z]{3,})$/);
  const monthDay = raw.match(/^(\d{4})[\s/-]+([A-Za-z]{3,})[\s/-]+(\d{1,2})$/);
  if (monthOnly || monthDay) {
    const match = monthDay || monthOnly!;
    const monthNames = ["jan", "feb", "mar", "apr", "may", "jun", "jul", "aug", "sep", "oct", "nov", "dec"];
    const month = monthNames.findIndex((name) => name === match[2].slice(0, 3).toLowerCase());
    if (month >= 0) {
      const date = new Date(Date.UTC(Number(match[1]), month, monthDay ? Number(monthDay[3]) : 1));
      return new Intl.DateTimeFormat("pt-BR", {
        ...(monthDay ? { day: "2-digit" as const } : {}),
        month: "short",
        year: "numeric",
        timeZone: "UTC",
      }).format(date);
    }
  }
  const date = new Date(raw);
  return isNaN(date.getTime())
    ? raw
    : new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "short", year: "numeric", timeZone: "UTC" }).format(date);
}

export function languageName(code?: string) {
  if (!code) return "não informado pelo PubMed";
  const names: Record<string, string> = {
    eng: "Inglês",
    en: "Inglês",
    por: "Português",
    pt: "Português",
    spa: "Espanhol",
    es: "Espanhol",
    fre: "Francês",
    fra: "Francês",
    fr: "Francês",
    ger: "Alemão",
    deu: "Alemão",
    de: "Alemão",
    ita: "Italiano",
    it: "Italiano",
    jpn: "Japonês",
    ja: "Japonês",
    chi: "Chinês",
    zho: "Chinês",
    ru: "Russo",
    rus: "Russo",
  };
  return names[code.toLowerCase()] || code.toUpperCase();
}
