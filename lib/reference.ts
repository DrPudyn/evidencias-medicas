type Reference = { id:string; title:string; authors:string; journal:string; date:string; doi?:string; url:string; source?:string };
/** A plain reference using only source metadata; no invented volume, pages or authors. */
export function formatReference(article:Reference) {
  const clean=(value:string)=>value.replace(/\s+/g," ").trim();
  const parts=[article.authors,article.title,article.journal,article.date].map(clean).filter(Boolean);
  if(article.doi)parts.push(`DOI: ${clean(article.doi)}`);
  if(/^\d{1,12}$/.test(article.id)&&(!article.source||article.source==="PubMed"||article.source==="local"))parts.push(`PMID: ${article.id}`);
  parts.push(article.url);
  return parts.join(". ");
}
