import { answerClinicalQuestion } from "@/lib/clinical/answer";
import { createClinicalAi } from "@/lib/clinical/provider";
import { quotaMessage, releaseClinicalQuota, reserveClinicalQuota } from "@/lib/clinical/quota";
import type { ClinicalSearchOptions, EvidenceRecord } from "@/lib/clinical/types";
import { queryForKind } from "@/lib/clinical/terms";
import { queryPubmed } from "@/lib/pubmed";
import { body, currentUser, json, rateLimit, sameOrigin, settings } from "@/lib/server";

async function searchHighLevel(term: string, options?: ClinicalSearchOptions): Promise<EvidenceRecord[]> {
  const kind = options?.kind || "high-level";
  const result = await queryPubmed({
    term: queryForKind(term, kind),
    sort: options?.sort || (kind === "high-level" ? "pub_date" : "relevance"),
    page: 1,
    retmax: 30,
    abstracts: true,
    highLevelOnly: !options?.includeTrials,
  });
  return result.articles.map((article) => ({
    pmid: article.id,
    title: article.title,
    journal: article.journal,
    date: article.date,
    authors: article.authors,
    type: article.type,
    doi: article.doi,
    url: article.url,
    abstract: article.abstract || "",
  }));
}

export async function POST(req: Request) {
  if (!sameOrigin(req)) return json({ error: "Origem não autorizada." }, 403);
  let payload: { question?: unknown };
  try {
    payload = await body(req, 4000);
  } catch {
    return json({ error: "Pergunta inválida." }, 400);
  }
  const question = typeof payload.question === "string" ? payload.question.trim() : "";
  if (question.length < 12 || question.length > 500) {
    return json({ error: "Escreva a pergunta clínica em português, entre 12 e 500 caracteres." }, 400);
  }
  if (!await rateLimit(req, "clinical-question", 45)) {
    return json({ error: "Muitas solicitações em pouco tempo. Aguarde antes de perguntar de novo." }, 429);
  }
  const env = settings();
  const ai = createClinicalAi(env);
  if (!ai) {
    return json({ error: "A síntese por IA não está configurada neste ambiente.", code: "ai_unconfigured" }, 503);
  }
  const user = await currentUser(req);
  let quota;
  try {
    quota = await reserveClinicalQuota(env.DB, { userId: user?.id, ip: req.headers.get("cf-connecting-ip") });
  } catch {
    return json({ error: "Não foi possível verificar o limite do plano. Confira se a migração de planos foi aplicada neste banco." }, 503);
  }
  if (!quota.allowed) {
    return json({ error: quotaMessage(quota.plan, quota.limit), plan: quota.plan, limit: quota.limit, used: quota.used }, 429);
  }
  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      const send = (payload: unknown) => controller.enqueue(encoder.encode(`${JSON.stringify(payload)}\n`));
      try {
        const answer = await answerClinicalQuestion({
          question,
          ai,
          search: searchHighLevel,
          cacheTerms: true,
          db: settings().DB,
          onStage: (stage) => send({ stage }),
        });
        send({
          stage: "done",
          answer,
          quota: {
            plan: quota.plan,
            limit: quota.limit,
            used: quota.used,
            remaining: Math.max(0, quota.limit - quota.used),
          },
        });
      } catch {
        await releaseClinicalQuota(env.DB, quota.key, quota.day).catch(() => undefined);
        send({ error: "Não foi possível consultar o PubMed agora. Esta tentativa não foi descontada do limite diário." });
      } finally {
        controller.close();
      }
    },
  });
  return new Response(stream, {
    headers: { "Content-Type": "application/x-ndjson; charset=utf-8", "Cache-Control": "no-store" },
  });
}
