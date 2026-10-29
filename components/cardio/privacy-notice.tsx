"use client";

import { useLocale } from "@/components/locale-provider";

import { Modal } from "@/components/cardio/modal";

export function PrivacyNotice({ onClose }: { onClose: () => void }) {
  const { t } = useLocale();
  return (
    <Modal title={t("Seus dados, com clareza.")} close={onClose}>
      <p className="modal-intro">{t("Informações da versão de desenvolvimento.")}</p>
      <div className="prose">
        <p>{t("O cadastro armazena nome, e-mail, perfil profissional, CRM e UF ou faculdade e estado. O telefone é opcional. A conta também guarda seus artigos favoritos e suas preferências.")}</p>
        <p>{t("A confirmação do e-mail é necessária para acessar a conta. Ela é diferente das notificações de conteúdo, que são opcionais e começam desmarcadas.")}</p>
        <p>{t("Na prévia local, um código de demonstração permite experimentar o fluxo sem enviar e-mail. Cadastros feitos aqui ficam no banco local deste projeto. Use dados fictícios durante a avaliação.")}</p>
        <p>{t("O CRM informado não passa por validação profissional nesta versão. Antes do lançamento, serão definidos o responsável pelo serviço, o contato de privacidade e a política completa.")}</p>
      </div>
    </Modal>
  );
}
