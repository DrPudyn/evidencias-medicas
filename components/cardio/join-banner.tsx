"use client";

import { useLocale } from "@/components/locale-provider";

import { ArrowUpRight } from "lucide-react";

export function JoinBanner({ signedIn, onAccount }: { signedIn: boolean; onAccount: () => void }) {
  const { t } = useLocale();
  return (
    <section className="container">
      <div className="join-banner">
        <div>
          <span className="eyebrow">{t("PARA QUEM CUIDA. PARA QUEM ESTUDA.")}</span>
          <h2>{" " + t("Seu próximo passo começa")}<br />{t("com uma boa referência.") + " "}</h2>
          <p>{t("Uma conta gratuita para reunir suas leituras em diferentes especialidades médicas.")}</p>
        </div>
        <div className="join-action">
          <button className="button light" onClick={onAccount}>
            {signedIn ? t("Minha conta") : t("Criar minha conta grátis")}
            <ArrowUpRight size={18} />
          </button>
          <span>{t("Sem cartão. No seu ritmo.")}</span>
        </div>
      </div>
    </section>
  );
}
