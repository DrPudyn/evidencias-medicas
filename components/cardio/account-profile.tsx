"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { LogOut } from "lucide-react";
import { Modal } from "@/components/cardio/modal";
import { PasskeyManager } from "@/components/passkey-actions";
import { useLocale } from "@/components/locale-provider";
import { api } from "@/components/cardio/api";
import type { AccountController } from "@/hooks/use-account";

export function ProfileModal({account,email,onClose}:{account:AccountController;email:string;onClose:()=>void}){
  const {t}=useLocale();
  const [name, setName] = useState(account.user?.name || "");
  const [theme, setTheme] = useState<"light" | "dark">(account.user?.theme === "dark" ? "dark" : "light");
  const [plan, setPlan] = useState<{ plan: string; limit: number; used: number } | null>(null);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  useEffect(() => { void api<{ plan: { plan: string; limit: number; used: number } | null }>("/api/account").then((data) => setPlan(data.plan)).catch(() => undefined); }, []);
  function applyTheme(next: "light" | "dark") {
    setTheme(next);
    document.documentElement.classList.toggle("theme-dark", next === "dark");
    try { localStorage.setItem("em-theme", next); } catch { /* ignore */ }
    void api("/api/account", { method: "PATCH", body: JSON.stringify({ theme: next }) });
  }
  return <Modal title={t("Minha conta")} close={onClose}>
    <p className="modal-intro">{email}</p>
    <form onSubmit={(event) => { event.preventDefault(); void api<{ user: { name: string } }>("/api/account", { method: "PATCH", body: JSON.stringify({ name }) }).then((data) => { if (account.user) account.setUser({ ...account.user, name: data.user.name }); }); }}>
      <label>Nome de exibição
        <input value={name} onChange={(event) => setName(event.target.value)} maxLength={80} />
      </label>
      <button className="button secondary" type="submit">Salvar nome</button>
    </form>
    <p>Tema</p>
    <button className="button secondary" type="button" onClick={() => applyTheme(theme === "dark" ? "light" : "dark")}>{theme === "dark" ? "Usar tema claro" : "Usar tema escuro"}</button>
    <p>{plan ? `${plan.plan}: ${plan.used} de ${plan.limit} perguntas hoje` : "Plano: carregando…"}</p>
    <PasskeyManager />
    <form onSubmit={(event) => { event.preventDefault(); void api("/api/account", { method: "PATCH", body: JSON.stringify({ currentPassword, newPassword }) }).then(() => { setCurrentPassword(""); setNewPassword(""); }).catch((error: Error) => account.setFormError(error.message)); }}>
      <label>Senha atual<input type="password" value={currentPassword} onChange={(event) => setCurrentPassword(event.target.value)} /></label>
      <label>Nova senha<input type="password" value={newPassword} onChange={(event) => setNewPassword(event.target.value)} minLength={12} /></label>
      <button className="button secondary" type="submit">Trocar senha</button>
    </form>
    {account.user?.role==="admin"&&<Link className="button full" href="/admin">{t("Abrir painel administrativo")}</Link>}
    {account.formError&&<p className="form-error" role="alert">{t(account.formError)}</p>}
    <button className="logout" onClick={account.logout}><LogOut size={16}/>{t("Sair da conta")}</button>
    {account.user?.role!=="admin"&&<button className="logout delete-account" onClick={()=>void account.deleteAccount()} disabled={account.busy}>{t("Excluir minha conta")}</button>}
  </Modal>;
}
