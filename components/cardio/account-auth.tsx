"use client";

import { GraduationCap, LoaderCircle, Mail, ShieldCheck, Stethoscope } from "lucide-react";
import { AccountConsent } from "@/components/cardio/account-consent";
import { Modal } from "@/components/cardio/modal";
import { ProfileFields } from "@/components/cardio/profile-fields";
import type { AccountController } from "@/hooks/use-account";

export function AuthModal({ account, onClose }: { account: AccountController; onClose: () => void }) {
  const title = account.step === 2 ? "Confira seu código." : account.mode === "login" ? "Bom ter você por aqui." : "Conhecimento começa com conexão.";
  const intro = account.step === 2
    ? `Confirme o acesso de ${account.profile.email}.`
    : account.mode === "login"
      ? "Entre com seu e-mail. Você não precisa de senha."
      : "Crie sua conta gratuita e organize suas leituras.";
  return (
    <Modal title={title} close={onClose}>
      <p className="modal-intro">{intro}</p>
      {account.step === 1 ? (
        <form onSubmit={account.requestCode}>
          {account.mode === "register" && (
            <div className="role-switch">
              <button type="button" className={account.profile.role === "doctor" ? "active" : ""} onClick={() => account.updateProfile("role", "doctor")}>
                <Stethoscope size={19} /> Sou médico(a)
              </button>
              <button type="button" className={account.profile.role === "student" ? "active" : ""} onClick={() => account.updateProfile("role", "student")}>
                <GraduationCap size={20} /> Sou estudante
              </button>
            </div>
          )}
          <label>
            E-mail
            <input type="email" autoComplete="email" value={account.profile.email} onChange={(event) => account.updateProfile("email", event.target.value)} required maxLength={254} placeholder="voce@exemplo.com" />
          </label>
          {account.mode === "register" && (
            <>
              <ProfileFields profile={account.profile} onChange={account.updateProfile} />
              <AccountConsent checked={account.consent} onChange={account.setConsent} />
            </>
          )}
          {account.formError && <p className="form-error" role="alert">{account.formError}</p>}
          <button className="button full" disabled={account.busy}>
            {account.busy ? <LoaderCircle className="spin" size={18} /> : <Mail size={18} />} {account.busy ? "Preparando acesso…" : "Receber código de acesso"}
          </button>
          <p className="auth-switch">
            {account.mode === "login" ? "Ainda não tem conta?" : "Já tem uma conta?"} <button type="button" onClick={() => { account.setMode(account.mode === "login" ? "register" : "login"); account.setFormError(""); }}>{account.mode === "login" ? "Cadastre-se" : "Entrar"}</button>
          </p>
        </form>
      ) : (
        <form onSubmit={account.verify}>
          {account.previewCode && (
            <div className="preview-code">
              <strong>Prévia local · sem envio de e-mail</strong>
              <p>
                Use o código <b>{account.previewCode}</b> para testar o fluxo. Isso não verifica a titularidade de um e-mail real.
              </p>
            </div>
          )}
          <label>
            Código de confirmação
            <input
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
          <p className="muted small-text">Válido por 10 minutos. Até 5 tentativas.</p>
          {account.formError && <p className="form-error" role="alert">{account.formError}</p>}
          <button className="button full" disabled={account.busy}>
            {account.busy ? <LoaderCircle className="spin" size={18} /> : <ShieldCheck size={18} />}
            Confirmar e entrar
          </button>
          <div className="code-actions">
            <button type="button" disabled={account.busy || account.cooldown > 0} onClick={() => account.requestCode()}>
              {account.cooldown > 0 ? `Reenviar em ${account.cooldown}s` : "Reenviar código"}
            </button>
            <button type="button" onClick={() => { account.setStep(1); account.setCode(""); account.setFormError(""); }}>
              Alterar e-mail
            </button>
          </div>
        </form>
      )}
    </Modal>
  );
}
