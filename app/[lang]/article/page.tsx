import { headers } from "next/headers";
import { notFound, redirect } from "next/navigation";
import { medicalSpecialties } from "@/lib/catalog";
import { currentUser } from "@/lib/server";
import { WeeklyScreen } from "../artigo-da-semana/page";

export const dynamic = "force-dynamic";

async function isSubscriber(userId: string) {
  const { settings } = await import("@/lib/server");
  const row = await settings().DB.prepare("SELECT plan, status FROM subscriptions WHERE user_id=?").bind(userId).first<{ plan: string; status: string }>();
  return row?.plan === "subscriber" && (row.status === "active" || row.status === "trialing");
}

export default async function WeeklyEn({ params, searchParams }: { params: Promise<{ lang: string }>; searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const { lang } = await params;
  const query = await searchParams;
  const requested = typeof query.specialty === "string" ? query.specialty : "cardiology";
  const specialty = medicalSpecialties.some(([id]) => id === requested) ? requested : "cardiology";
  if (lang === "pt") redirect(`/pt/artigo-da-semana?specialty=${specialty}`);
  if (lang !== "en") notFound();
  const headerList = await headers();
  const user = await currentUser(new Request("https://local/en/article", { headers: { cookie: headerList.get("cookie") || "" } }));
  const subscribed = user ? await isSubscriber(user.id) : false;
  return <WeeklyScreen lang="en" specialty={specialty} signedIn={Boolean(user)} subscribed={subscribed} />;
}
