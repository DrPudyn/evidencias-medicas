type Review = { articleId: string; title: string; supersededBy: string; status: string };
type Document = { id: string; title: string; url: string };

export function replacementFor(articleId: string, reviews: Review[], catalog: Document[]) {
  const review = reviews.find(item => item.articleId === articleId && item.status === "published");
  const id = review?.supersededBy;
  if (!id || id === articleId) return null;
  const document = catalog.find(item => item.id === id);
  if (document) return { id, title: document.title, url: document.url };
  if (!/^\d{1,12}$/.test(id)) return null;
  return { id, title: reviews.find(item => item.articleId === id && item.status === "published")?.title || `PubMed · PMID ${id}`,
    url: `https://pubmed.ncbi.nlm.nih.gov/${id}/` };
}
