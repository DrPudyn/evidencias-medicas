"use client";
import { LoaderCircle, LockKeyhole } from "lucide-react";
import { Modal } from "@/components/cardio/modal";
import { useLocale } from "@/components/locale-provider";
import type { AccountController } from "@/hooks/use-account";

export function AuthModal({account,onClose}:{account:AccountController;onClose:()=>void}){
  const {t}=useLocale();
  const recovering=account.mode==="forgot", resetting=account.mode==="reset", registering=account.mode==="register";
  const verifying=account.mode==="verify",pending=account.mode==="pending";
  const title=verifying||pending?"Confirme seu e-mail":resetting?"Defina sua senha":recovering?"Recuperar acesso":registering?"Crie sua conta":"Entre na sua conta";
  function switchMode(mode:string){account.setMode(mode);account.setPassword("");account.setFormError("");account.setNotice("");}
  return <Modal title={t(title)} close={onClose}>
    <p className="modal-intro">{t(verifying?"Confirme o endereço para ativar sua conta.":pending?"Abra o link enviado ao seu e-mail. Depois, entre com sua senha.":resetting?"Escolha uma senha de 12 a 128 caracteres.":recovering?"Enviaremos um link para definir sua senha.":"Apenas e-mail e senha. Sem outros dados.")}</p>
    <form onSubmit={account.submit}>
      {!resetting&&!verifying&&!pending&&<label>{t("E-mail")}<input type="email" autoComplete="email" value={account.email} onChange={e=>account.setEmail(e.target.value)} required maxLength={254}/></label>}
      {!recovering&&!verifying&&!pending&&<label>{t("Senha")}<input type="password" autoComplete={registering||resetting?"new-password":"current-password"} value={account.password} onChange={e=>account.setPassword(e.target.value)} required minLength={registering||resetting?12:1} maxLength={128}/></label>}
      {registering&&<p className="muted small-text">{t("Sua conta fica pronta na hora. Não enviamos código de confirmação.")}</p>}
      {(registering||resetting)&&<p className="muted small-text">{t("Use de 12 a 128 caracteres. Espaços são permitidos.")}</p>}
      {account.formError&&<p className="form-error" role="alert">{t(account.formError)}</p>}
      {account.notice&&<p role="status">{t(account.notice)}</p>}
      {account.previewResetUrl&&<p className="preview-code"><a href={account.previewResetUrl}>{t("Prévia local: abrir link de acesso")}</a></p>}
      {!pending&&<button className="button full" disabled={account.busy}>{account.busy?<LoaderCircle className="spin" size={18}/>:<LockKeyhole size={18}/>} {t(account.busy?"Aguarde…":verifying?"Confirmar e-mail":resetting?"Salvar senha":recovering?"Enviar link":registering?"Criar conta":"Entrar")}</button>}
      {!resetting&&!verifying&&<p className="auth-switch">
        <button type="button" disabled={account.busy} onClick={()=>switchMode(registering||recovering||pending?"login":"register")}>{t(registering||recovering||pending?"Já tenho uma conta":"Criar conta")}</button>
        {!recovering&&!pending&&<button type="button" disabled={account.busy} onClick={()=>switchMode("forgot")}>{t("Esqueci ou ainda não tenho senha")}</button>}
      </p>}
    </form>
  </Modal>;
}
