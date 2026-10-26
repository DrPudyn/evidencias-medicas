"use client";

import { ArrowUpRight } from "lucide-react";

export function JoinBanner({ signedIn, onAccount }: { signedIn: boolean; onAccount: () => void }) {
  return (
    <section className="container">
      <div className="join-banner">
        <div>
          <span className="eyebrow">PARA QUEM CUIDA. PARA QUEM ESTUDA.</span>
          <h2>
            Seu próximo passo começa<br />com uma boa referência.
          </h2>
          <p>Uma conta gratuita para reunir suas leituras em diferentes especialidades médicas.</p>
        </div>
        <div className="join-action">
          <button className="button light" onClick={onAccount}>
            {signedIn ? "Minha conta" : "Criar minha conta grátis"}
            <ArrowUpRight size={18} />
          </button>
          <span>Sem cartão. No seu ritmo.</span>
        </div>
      </div>
    </section>
  );
}
