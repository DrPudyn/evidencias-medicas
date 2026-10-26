"use client";

import { ArrowRight } from "lucide-react";
import { Modal } from "@/components/cardio/modal";

export function SearchGuide({
  onClose,
  onExplore,
  onTryExample,
}: {
  onClose: () => void;
  onExplore: () => void;
  onTryExample: () => void;
}) {
  return (
    <Modal title="Uma boa pergunta abre caminhos." close={onClose} wide>
      <p className="modal-intro">Um guia rápido para pesquisar em cardiologia.</p>
      <div className="guide-steps">
        <div>
          <span>01</span>
          <div>
            <h3>Comece pela pergunta.</h3>
            <p>Defina a população, a intervenção, a comparação e o desfecho. Exemplo: pessoas com insuficiência cardíaca; empagliflozina; placebo; hospitalização.</p>
          </div>
        </div>
        <div>
          <span>02</span>
          <div>
            <h3>Escolha termos e filtros.</h3>
            <p>Use uma doença ou medicamento. Traduzimos alguns termos frequentes, como “hipertensão” e “insuficiência cardíaca”. Para buscas mais específicas, experimente termos em inglês e operadores AND e OR.</p>
            <button className="text-link" onClick={onTryExample}>
              Experimentar esta busca <ArrowRight size={15} />
            </button>
          </div>
        </div>
        <div>
          <span>03</span>
          <div>
            <h3>Observe o desenho do estudo.</h3>
            <p>Ensaio clínico, revisão sistemática e diretriz respondem a perguntas diferentes. A classificação do PubMed ajuda a filtrar, mas não substitui a avaliação da qualidade.</p>
          </div>
        </div>
        <div>
          <span>04</span>
          <div>
            <h3>Confira a fonte e o contexto.</h3>
            <p>Leia os métodos, a população, os resultados e as limitações no artigo original. Publicação recente, por si só, não significa mudança de conduta.</p>
          </div>
        </div>
      </div>
      <button className="button full" onClick={onExplore}>
        Ir para a busca <ArrowRight size={17} />
      </button>
    </Modal>
  );
}
