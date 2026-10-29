"use client";
import { LogOut } from "lucide-react";
import { Modal } from "@/components/cardio/modal";
import { useLocale } from "@/components/locale-provider";
import type { AccountController } from "@/hooks/use-account";
export function ProfileModal({account,email,onClose}:{account:AccountController;email:string;onClose:()=>void}){
  const {t}=useLocale();
  return <Modal title={t("Minha conta")} close={onClose}>
    <p className="modal-intro">{email}</p>
    <button className="button full secondary" onClick={()=>{account.openAuth("forgot");account.setEmail(email);}}>{t("Definir ou recuperar senha")}</button>
    {account.user?.role==="admin"&&<a className="button full" href="/admin">{t("Abrir painel administrativo")}</a>}
    {account.formError&&<p className="form-error" role="alert">{t(account.formError)}</p>}
    <button className="logout" onClick={account.logout}><LogOut size={16}/>{t("Sair da conta")}</button>
    {account.user?.role!=="admin"&&<button className="logout delete-account" onClick={()=>void account.deleteAccount()} disabled={account.busy}>{t("Excluir minha conta")}</button>}
  </Modal>;
}
