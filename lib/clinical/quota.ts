import { PLAN_LIMITS, type PlanId } from "../plans";

async function digest(value: string) {
  const bytes = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value));
  return [...new Uint8Array(bytes)].map((item) => item.toString(16).padStart(2, "0")).join("");
}

export type QuotaDb = {
  prepare: (sql: string) => {
    bind: (...params: unknown[]) => {
      first: <T>() => Promise<T | null>;
      run: () => Promise<{ meta?: { changes?: number } }>;
    };
  };
};

export type QuotaReservation = {
  allowed: boolean;
  plan: PlanId;
  limit: number;
  used: number;
  key: string;
  day: string;
};

export function saoPauloDay(now = new Date(), shiftDays = 0) {
  const shifted = new Date(now.getTime() + shiftDays * 86_400_000);
  return new Intl.DateTimeFormat("en-CA", { timeZone: "America/Sao_Paulo" }).format(shifted);
}

export async function reserveClinicalQuota(
  db: QuotaDb,
  subject: { userId?: string | null; ip?: string | null },
  now = new Date(),
): Promise<QuotaReservation> {
  const day = saoPauloDay(now);
  await db.prepare("DELETE FROM clinical_quota WHERE day < ?").bind(saoPauloDay(now, -45)).run();
  let plan: PlanId = "anonymous";
  let key: string;
  if (subject.userId) {
    const row = await db.prepare("SELECT plan, status FROM subscriptions WHERE user_id = ?").bind(subject.userId).first<{ plan: string; status: string }>();
    plan = row?.plan === "subscriber" && (row.status === "active" || row.status === "trialing") ? "subscriber" : "free";
    key = `user:${subject.userId}`;
  } else {
    key = `ip:${await digest(`clinical-anon:${subject.ip || "local"}`)}`;
  }
  const limit = PLAN_LIMITS[plan];
  const inserted = await db.prepare(
    `INSERT INTO clinical_quota (subject_key, day, count) VALUES (?, ?, 1)
     ON CONFLICT(subject_key, day) DO UPDATE SET count = count + 1
     WHERE clinical_quota.count < ?
     RETURNING count`,
  ).bind(key, day, limit).first<{ count: number }>();
  if (!inserted) {
    const current = await db.prepare("SELECT count FROM clinical_quota WHERE subject_key = ? AND day = ?").bind(key, day).first<{ count: number }>();
    return { allowed: false, plan, limit, used: current?.count ?? limit, key, day };
  }
  return { allowed: true, plan, limit, used: inserted.count, key, day };
}

export async function releaseClinicalQuota(db: QuotaDb, key: string, day: string) {
  await db.prepare("UPDATE clinical_quota SET count = MAX(count - 1, 0) WHERE subject_key = ? AND day = ?").bind(key, day).run();
}

export function quotaMessage(plan: PlanId, limit: number) {
  if (plan === "anonymous") {
    return `O uso sem conta permite ${limit} pergunta clínica por dia nesta rede. Entre para usar o plano grátis (3 por dia) ou a assinatura (40 por dia).`;
  }
  if (plan === "free") {
    return `O plano grátis permite ${limit} perguntas clínicas por dia. A assinatura prevista permite 40 por dia.`;
  }
  return `A assinatura permite ${limit} perguntas clínicas por dia. O limite de hoje foi atingido.`;
}
