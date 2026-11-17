"use client";

import { useLocale } from "@/components/locale-provider";

import { ExternalLink } from "lucide-react";
import { Logo } from "@/components/cardio/logo";

export function SiteFooter({ onPrivacy }: { onPrivacy: () => void }) {
  const { t, locale } = useLocale();
  return (
    <footer className="container footer">
      <div>
        <Logo />
        <p>{t("Um lugar calmo para a pergunta clínica.")}</p>
      </div>
      <div className="footer-links">
        <a href={locale === "en" ? "/en/guide" : "/pt/guia"}>{t("Guia de busca")}</a>
        <button onClick={onPrivacy}>{t("Privacidade")}</button>
        <button onClick={() => window.dispatchEvent(new Event("em:manage-analytics"))}>{t("Gerenciar métricas de uso")}</button>
        <a href="https://pubmed.ncbi.nlm.nih.gov/" target="_blank" rel="noreferrer">{" " + t("Conheça o PubMed") + " "}<ExternalLink size={12} />
        </a>
      </div>
      <div className="footer-note">{" " + t("Especialidades médicas reconhecidas pelo CFM") + " "}<br />
        <span>{t("Conteúdo para atualização científica.")}</span>
      </div>
    </footer>
  );
}
