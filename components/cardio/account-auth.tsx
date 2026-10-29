"use client";

import { useLocale } from "@/components/locale-provider";

import { GraduationCap, LoaderCircle, Mail, ShieldCheck, Stethoscope } from "lucide-react";
import { AccountConsent } from "@/components/cardio/account-consent";
import { Modal } from "@/components/cardio/modal";
import { ProfileFields } from "@/components/cardio/profile-fields";
import type { AccountController } from "@/hooks/use-account";

export function AuthModal({ account, onClose }: { account: AccountController; onClose: () => void }) {
  const { t } = useLocale();
  const title = account.step === 2 ? t("Confira seu código.") : account.mode === "login" ? t("Bom ter você por aqui.") : t("Conhecimento começa com conexão.");
  const intro = account.step === 2
    ? `${t("Confirme o acesso de")} ${account.profile.email}.`
    : account.mode === "login"
      ? t("Entre com seu e-mail. Você não precisa de senha.")
      : t("Crie sua conta gratuita e organize suas leituras.");
  return (
    <Modal title={title} close={onClose}>
      <p className="modal-intro">{intro}</p>
      {account.step === 1 ? (
        <form onSubmit={account.requestCode}>
          {account.mode === "register" && (
            <div className="role-switch">
              <button type="button" className={account.profile.role === "doctor" ? "active" : ""} onClick={() => account.updateProfile("role", "doctor")}>
                <Stethoscope size={19} />{" " + t("Sou médico(a)") + " "}</button>
              <button type="button" className={account.profile.role === "student" ? "active" : ""} onClick={() => account.updateProfile("role", "student")}>
                <GraduationCap size={20} />{" " + t("Sou estudante") + " "}</button>
            </div>
          )}
          <label>{" " + t("E-mail") + " "}<input type="email" autoComplete="email" value={account.profile.email} onChange={(event) => account.updateProfile("email", event.target.value)} required maxLength={254} placeholder={t("voce@exemplo.com")} />
          </label>
          {account.mode === "register" && (
            <>
              <ProfileFields profile={account.profile} onChange={account.updateProfile} />
              <AccountConsent checked={account.consent} onChange={account.setConsent} />
            </>
          )}
          {account.formError && <p className="form-error" role="alert">{t(account.formError)}</p>}
          <button className="button full" disabled={account.busy}>
            {account.busy ? <LoaderCircle className="spin" size={18} /> : <Mail size={18} />} {account.busy ? t("Preparando acesso…") : t("Receber código de acesso")}
          </button>
          <p className="auth-switch">
            {account.mode === "login" ? t("Ainda não tem conta?") : t("Já tem uma conta?")} <button type="button" onClick={() => { account.setMode(account.mode === "login" ? "register" : "login"); account.setFormError(""); }}>{account.mode === "login" ? t("Cadastre-se") : t("Entrar")}</button>
          </p>
        </form>
      ) : (
        <form onSubmit={account.verify}>
          {account.previewCode && (
            <div className="preview-code">
              <strong>{t("Prévia local · sem envio de e-mail")}</strong>
              <p>{" " + t("Use o código") + " "}<b>{account.previewCode}</b>{" " + t("para testar o fluxo. Isso não verifica a titularidade de um e-mail real.") + " "}</p>
            </div>
          )}
          <label>{" " + t("Código de confirmação") + " "}<input
              className="code-input"
              autoFocus
              autoComplete="one-time-code"
              inputMode="numeric"
              pattern="[0-9]{6}"
              maxLength={6}
              minLength={6}
              required
              placeholder="000000"
              value={account.code}
              onChange={(event) => account.setCode(event.target.value.replace(/\D/g, ""))}
            />
          </label>
          <p className="muted small-text">{t("Válido por 10 minutos. Até 5 tentativas.")}</p>
          {account.formError && <p className="form-error" role="alert">{t(account.formError)}</p>}
          <button className="button full" disabled={account.busy}>
            {account.busy ? <LoaderCircle className="spin" size={18} /> : <ShieldCheck size={18} />}{" "}{t("Confirmar e entrar")}{" "}</button>
          <div className="code-actions">
            <button type="button" disabled={account.busy || account.cooldown > 0} onClick={() => account.requestCode()}>
              {account.cooldown > 0 ? `${t("Reenviar em")} ${account.cooldown}s` : t("Reenviar código")}
            </button>
            <button type="button" onClick={() => { account.setStep(1); account.setCode(""); account.setFormError(""); }}>{" " + t("Alterar e-mail") + " "}</button>
          </div>
        </form>
      )}
    </Modal>
  );
}
