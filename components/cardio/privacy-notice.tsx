"use client";
import { Modal } from "@/components/cardio/modal";
import { useLocale } from "@/components/locale-provider";
export function PrivacyNotice({onClose}:{onClose:()=>void}){
  const {t}=useLocale();
  return <Modal title={t("Privacidade")} close={onClose}>
    <div className="prose"><p>{t("O cadastro solicita apenas e-mail e senha. A senha é armazenada como hash com salt individual, nunca em texto puro.")}</p>
    <p>{t("Sua conta guarda os artigos salvos. Não solicitamos nome, CRM, faculdade, estado ou telefone nesta etapa.")}</p>
    <p>{t("A recuperação de senha envia um link temporário ao seu e-mail. Definir uma nova senha encerra as sessões anteriores.")}</p></div>
  </Modal>;
}
