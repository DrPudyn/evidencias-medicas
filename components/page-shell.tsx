import { headers } from "next/headers";
import type { ReactNode } from "react";
import { SiteHeader } from "@/components/cardio/site-header";
import { currentUser } from "@/lib/server";
import type { Profile } from "@/components/cardio/types";

export async function PageShell({ children }: { children: ReactNode }) {
  const headerList = await headers();
  let user: Profile | null = null;
  try {
    user = await currentUser(new Request("https://local/", { headers: { cookie: headerList.get("cookie") || "" } })) as Profile | null;
  } catch {
    user = null;
  }
  return (
    <>
      <SiteHeader user={user} />
      {children}
    </>
  );
}
