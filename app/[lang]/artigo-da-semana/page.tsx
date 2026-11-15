import type { Metadata } from "next";
import { headers } from "next/headers";
import { notFound, redirect } from "next/navigation";
import { medicalSpecialties } from "@/lib/catalog";
import { HIGH_LEVEL_EVIDENCE_FILTER, queryPubmed } from "@/lib/pubmed";
import { currentUser, settings } from "@/lib/server";
import { pickWeeklyArticle, summaryFromAbstract, summaryKeepsSourceNumbers, weekKey, type WeeklyPick } from "@/lib/weekly-article";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Artigo da semana · Busca Evidência", robots: { index: false, follow: false } };

async function isSubscriber(userId: string) {
  const row = await settings().DB.prepare("SELECT plan, status FROM subscriptions WHERE user_id=?").bind(userId).first<{ plan: string; status: string }>();
  return row?.plan === "subscriber" && (row.status === "active" || row.status === "trialing");
}

async function loadWeek(specialty: string): Promise<WeeklyPick | null> {
  const key = `${specialty}|${weekKey()}`;
  const db = settings().DB;
  try {
    const cached = await db.prepare("SELECT payload FROM weekly_article WHERE cache_key=?").bind(key).first<{ payload: string }>();
    if (cached?.payload) return JSON.parse(cached.payload) as WeeklyPick;
  } catch {
    // Migration 0008 creates the table. This request still tries to build the article.
  }
  const specialtyRow = medicalSpecialties.find(([id]) => id === specialty);
  if (!specialtyRow) return null;
  const mesh = specialty === "cardiology"
    ? '"Cardiovascular Diseases"[MeSH Terms]'
    : specialty === "endocrinology"
      ? '"Endocrine System Diseases"[MeSH Terms]'
      : `("${specialtyRow[2].split(";")[0]}"[Title/Abstract])`;
  const term = `${mesh} AND (${HIGH_LEVEL_EVIDENCE_FILTER} OR "Randomized Controlled Trial"[Publication Type]) NOT (animals[mh] NOT humans[mh])`;
  const result = await queryPubmed({ term, sort: "pub_date", page: 1, retmax: 20, reldate: 28, abstracts: true });
  const picked = pickWeeklyArticle(result.articles);
  if (!picked?.abstract) return null;
  let summary = summaryFromAbstract(picked.abstract);
  const ai = settings().AI;
  if (ai?.run) {
    try {
      const model = settings().WORKERS_AI_MODEL || "@cf/meta/llama-3.3-70b-instruct-fp8-fast";
      const response = await ai.run(model, {
        messages: [
          { role: "system", content: "Reescreva o abstract em português, só com o que ele diz. Use as seções Objetivo, Método, Principais resultados, Conclusão e Aplicação prática. Copie os números exatamente. Se a seção não existir, escreva: Não consta no resumo. Não invente." },
          { role: "user", content: picked.abstract.slice(0, 6000) },
        ],
        max_tokens: 700,
        temperature: 0,
      });
      const text = typeof response === "string" ? response : JSON.stringify(response);
      const match = text.match(/Objetivo[\s\S]{20,4000}/);
      const candidate = match?.[0] || "";
      if (candidate && summaryKeepsSourceNumbers(candidate, picked.abstract)) summary = candidate;
    } catch {
      // Keep the sentences taken from the abstract.
    }
  }
  const payload: WeeklyPick = {
    pmid: picked.id,
    title: picked.title,
    journal: picked.journal,
    date: picked.date || "",
    type: picked.type,
    url: picked.url || `https://pubmed.ncbi.nlm.nih.gov/${picked.id}/`,
    abstract: picked.abstract,
    summary,
  };
  await db.prepare("INSERT INTO weekly_article(cache_key,payload,updated_at) VALUES(?,?,?) ON CONFLICT(cache_key) DO UPDATE SET payload=excluded.payload, updated_at=excluded.updated_at")
    .bind(key, JSON.stringify(payload), Date.now()).run().catch(() => undefined);
  return payload;
}

export async function WeeklyScreen({ lang, specialty, signedIn, subscribed }: { lang: "pt" | "en"; specialty: string; signedIn: boolean; subscribed: boolean }) {
  const en = lang === "en";
  const plans = en ? "/en#planos" : "/pt#planos";
  const article = subscribed ? await loadWeek(specialty) : null;
  return (
    <main className="guide-page container">
      <p className="eyebrow">{en ? "PREMIUM" : "PREMIUM"}</p>
      <h1>{en ? "Article of the week" : "Artigo da semana"}</h1>
      <p>{en
        ? "One recent PubMed article for the specialty, kept for the whole week. The summary uses only the abstract."
        : "Um artigo recente do PubMed para a especialidade, o mesmo durante a semana. O resumo usa só o abstract."}</p>
      <form method="get">
        <label>{en ? "Specialty" : "Especialidade"}
          <select name="specialty" defaultValue={specialty}>
            {medicalSpecialties.map(([id, label]) => <option key={id} value={id}>{label}</option>)}
          </select>
        </label>
        <button className="button secondary" type="submit">{en ? "Show this specialty" : "Ver esta especialidade"}</button>
      </form>
      {!subscribed ? (
        <article className="glass-card plan-card">
          <h2>{en ? "Subscribers only" : "Só para assinantes"}</h2>
          <p>{en
            ? "The detailed weekly summary is part of Premium. Search, the library and the guide stay on the free plan."
            : "O resumo semanal detalhado faz parte do Premium. A busca, a biblioteca e o guia continuam no plano grátis."}</p>
          <a className="button" href={plans}>{en ? "See plans" : "Ver planos"}</a>
          {!signedIn ? <p><a href={en ? "/en/entrar" : "/pt/entrar"}>{en ? "Sign in" : "Entrar"}</a></p> : null}
        </article>
      ) : article ? (
        <article className="glass-card answer-card">
          <p className="eyebrow">{article.type} · {article.date}</p>
          <h2><a href={article.url}>{article.title}</a></h2>
          <p>{article.journal}</p>
          {article.summary.split("\n").map((line) => <p key={line.slice(0, 40)}>{line}</p>)}
          <p><a href={article.url}>{en ? "Open on PubMed" : "Abrir no PubMed"}</a></p>
        </article>
      ) : (
        <p>{en ? "No article with an abstract was found for this specialty in the last few weeks." : "Não achamos, nas últimas semanas, um artigo com resumo para esta especialidade."}</p>
      )}
    </main>
  );
}

export default async function WeeklyPt({ params, searchParams }: { params: Promise<{ lang: string }>; searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const { lang } = await params;
  const query = await searchParams;
  const requested = typeof query.specialty === "string" ? query.specialty : "cardiology";
  const specialty = medicalSpecialties.some(([id]) => id === requested) ? requested : "cardiology";
  if (lang === "en") redirect(`/en/article?specialty=${specialty}`);
  if (lang !== "pt") notFound();
  const headerList = await headers();
  const user = await currentUser(new Request("https://local/pt/artigo-da-semana", { headers: { cookie: headerList.get("cookie") || "" } }));
  const subscribed = user ? await isSubscriber(user.id) : false;
  return <WeeklyScreen lang="pt" specialty={specialty} signedIn={Boolean(user)} subscribed={subscribed} />;
}
