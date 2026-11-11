"use client";
import Link from "next/link";

import { LanguageSwitcher, useLocale } from "@/components/locale-provider";

import { ArrowUpRight, Bookmark, ChevronDown, ShieldCheck } from "lucide-react";
import type { Profile } from "@/components/cardio/types";
import { Logo } from "@/components/cardio/logo";

export function SiteHeader({
  user,
  onGuide,
  onLibrary,
  onProfile,
  onLogin,
  onRegister,
}: {
  user: Profile | null;
  onGuide: () => void;
  onLibrary: () => void;
  onProfile: () => void;
  onLogin: () => void;
  onRegister: () => void;
}) {
  const { t } = useLocale();
  return (
    <header className="header">
      <div className="container nav">
        <Logo />
        <nav aria-label={t("Navegação principal")}>
          <a href="#explorar">{t("Explorar artigos")}</a>
          <a href="#planos">{t("Planos")}</a>
          <button onClick={onGuide}>{t("Guia de busca")}</button>
          <a href="#recursos">{t("A plataforma")}</a>
        </nav>
        <div className="nav-actions">
          <LanguageSwitcher />
          {user ? (
            <>
              {user.role === "admin" && (
                <Link className="text-button" href="/admin">
                  <ShieldCheck size={16} />{" " + t("Painel administrativo") + " "}</Link>
              )}
              <button className="text-button library-nav" onClick={onLibrary}>
                <Bookmark size={16} />{" " + t("Biblioteca") + " "}</button>
              <button className="avatar-button" onClick={onProfile}>
                <span>{user.name.charAt(0)}</span>
                {user.name.split(" ")[0]}
                <ChevronDown size={14} />
              </button>
            </>
          ) : (
            <>
              <button className="text-button" onClick={onLogin}>{" " + t("Entrar") + " "}</button>
              <button className="button small" onClick={onRegister}>{" " + t("Criar conta grátis") + " "}<ArrowUpRight size={16} />
              </button>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
