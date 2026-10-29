"use client";

import { useLocale } from "@/components/locale-provider";

import { ExternalLink } from "lucide-react";
import { Logo } from "@/components/cardio/logo";

export function SiteFooter({ onGuide, onPrivacy }: { onGuide: () => void; onPrivacy: () => void }) {
  const { t } = useLocale();
  return (
    <footer className="container footer">
      <div>
        <Logo />
        <p>{t("Ciência para acompanhar você.")}</p>
      </div>
      <div className="footer-links">
        <button onClick={onGuide}>{t("Guia de busca")}</button>
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
