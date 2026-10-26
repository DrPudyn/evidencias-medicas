"use client";

import { ExternalLink } from "lucide-react";
import { Logo } from "@/components/cardio/logo";

export function SiteFooter({ onGuide, onPrivacy }: { onGuide: () => void; onPrivacy: () => void }) {
  return (
    <footer className="container footer">
      <div>
        <Logo />
        <p>Ciência para acompanhar você.</p>
      </div>
      <div className="footer-links">
        <button onClick={onGuide}>Guia de busca</button>
        <button onClick={onPrivacy}>Privacidade</button>
        <button onClick={() => window.dispatchEvent(new Event("em:manage-analytics"))}>Gerenciar métricas de uso</button>
        <a href="https://pubmed.ncbi.nlm.nih.gov/" target="_blank" rel="noreferrer">
          Conheça o PubMed <ExternalLink size={12} />
        </a>
      </div>
      <div className="footer-note">
        Especialidades médicas reconhecidas pelo CFM
        <br />
        <span>Conteúdo para atualização científica.</span>
      </div>
    </footer>
  );
}
