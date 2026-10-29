"use client";
import { LoaderCircle, LockKeyhole } from "lucide-react";
import { Modal } from "@/components/cardio/modal";
import { useLocale } from "@/components/locale-provider";
import type { AccountController } from "@/hooks/use-account";

export function AuthModal({account,onClose}:{account:AccountController;onClose:()=>void}){
  const {t}=useLocale();
  const recovering=account.mode==="forgot", resetting=account.mode==="reset", firstAccess=account.mode==="first-access", registering=account.mode==="register";
  const title=firstAccess?"Primeiro acesso":resetting?"Defina sua senha":recovering?"Recuperar acesso":registering?"Crie sua conta":"Entre na sua conta";
  function switchMode(mode:string){account.setMode(mode);account.setPassword("");account.setFormError("");account.setNotice("");}
  return <Modal title={t(title)} close={onClose}>
    <p className="modal-intro">{t(resetting||firstAccess?"Escolha uma senha de 12 a 128 caracteres.":recovering?"Enviaremos um link para definir sua senha.":"Apenas e-mail e senha. Sem outros dados.")}</p>
    <form onSubmit={account.submit}>
      {!resetting&&<label>{t("E-mail")}<input type="email" autoComplete="email" value={account.email} onChange={e=>account.setEmail(e.target.value)} required maxLength={254}/></label>}
      {!recovering&&<label>{t("Senha")}<input type="password" autoComplete={registering||resetting||firstAccess?"new-password":"current-password"} value={account.password} onChange={e=>account.setPassword(e.target.value)} required minLength={registering||resetting||firstAccess?12:1} maxLength={128}/></label>}
      {(registering||resetting||firstAccess)&&<p className="muted small-text">{t("Use de 12 a 128 caracteres. Espaços são permitidos.")}</p>}
      {account.formError&&<p className="form-error" role="alert">{t(account.formError)}</p>}
      {account.notice&&<p role="status">{t(account.notice)}</p>}
      {account.previewResetUrl&&<p className="preview-code"><a href={account.previewResetUrl}>{t("Prévia local: abrir link de definição de senha")}</a></p>}
      <button className="button full" disabled={account.busy}>{account.busy?<LoaderCircle className="spin" size={18}/>:<LockKeyhole size={18}/>} {t(account.busy?"Aguarde…":resetting||firstAccess?"Salvar senha":recovering?"Enviar link":registering?"Criar conta":"Entrar")}</button>
      {!resetting&&<p className="auth-switch">
        <button type="button" disabled={account.busy} onClick={()=>switchMode(registering||recovering?"login":"register")}>{t(registering||recovering?"Já tenho uma conta":"Criar conta")}</button>
        <button type="button" disabled={account.busy} onClick={()=>switchMode("first-access")}>{t("Primeiro acesso")}</button>
        {!recovering&&<button type="button" disabled={account.busy} onClick={()=>switchMode("forgot")}>{t("Esqueci minha senha")}</button>}
      </p>}
    </form>
  </Modal>;
}
