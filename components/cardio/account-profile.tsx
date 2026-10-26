"use client";

import { Check, GraduationCap, LoaderCircle, LogOut, ShieldCheck, Stethoscope } from "lucide-react";
import { Modal } from "@/components/cardio/modal";
import { ProfileFields } from "@/components/cardio/profile-fields";
import type { AccountController } from "@/hooks/use-account";
import type { Profile } from "@/components/cardio/types";

function roleLabel(profile: Profile) {
  if (profile.role === "admin") return "Administrador";
  if (profile.role === "doctor") return "Médico(a)";
  return "Estudante";
}

export function ProfileModal({ account, email, onClose }: { account: AccountController; email: string; onClose: () => void }) {
  return (
    <Modal title="Seu perfil, suas escolhas." close={onClose}>
      <p className="modal-intro">{email} · {roleLabel(account.profile)}</p>
      <form onSubmit={account.saveProfile}>
        {account.profile.role !== "admin" && (
          <div className="role-switch" role="group" aria-label="Tipo de perfil">
            <button type="button" aria-pressed={account.profile.role === "doctor"} className={account.profile.role === "doctor" ? "active" : ""} onClick={() => account.updateProfile("role", "doctor")}>
              <Stethoscope size={19} /> Sou médico(a)
            </button>
            <button type="button" aria-pressed={account.profile.role === "student"} className={account.profile.role === "student" ? "active" : ""} onClick={() => account.updateProfile("role", "student")}>
              <GraduationCap size={20} /> Sou estudante
            </button>
          </div>
        )}
        <ProfileFields profile={account.profile} onChange={account.updateProfile} />
        {account.formError && <p className="form-error" role="alert">{account.formError}</p>}
        <button className="button full" disabled={account.busy}>
          {account.busy ? <LoaderCircle size={18} className="spin" /> : <Check size={18} />}
          Salvar alterações
        </button>
      </form>
      <button className="logout" onClick={account.logout}>
        <LogOut size={16} /> Sair da conta
      </button>
      {account.user?.role !== "admin" && (
        <button className="logout delete-account" onClick={() => void account.deleteAccount()} disabled={account.busy}>
          Excluir minha conta
        </button>
      )}
      {account.user?.role === "admin" && (
        <a className="button full" href="/admin">
          <ShieldCheck size={18} /> Abrir painel administrativo
        </a>
      )}
    </Modal>
  );
}
