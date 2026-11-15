"use client";
import Link from "next/link";

import { LanguageSwitcher, useLocale } from "@/components/locale-provider";

import { ArrowUpRight, Bookmark, ChevronDown, ShieldCheck } from "lucide-react";
import type { Profile } from "@/components/cardio/types";
import { Logo } from "@/components/cardio/logo";

export function SiteHeader({
  user,
  onLibrary,
  onProfile,
  onLogin,
  onRegister,
}: {
  user: Profile | null;
  onLibrary: () => void;
  onProfile: () => void;
  onLogin: () => void;
  onRegister: () => void;
}) {
  const { t, locale } = useLocale();
  const home = locale === "en" ? "/en" : "/pt";
  const guide = locale === "en" ? "/en/guide" : "/pt/guia";
  return (
    <header className="header">
      <div className="container nav">
        <Logo />
        <nav aria-label={t("Navegação principal")}>
          <a href="#explorar">{t("Explorar artigos")}</a>
          <a href="#planos">{t("Planos")}</a>
          <a href={guide}>{t("Guia de busca")}</a>
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
              <a className="text-button library-nav" href={locale === "en" ? "/en/library" : "/pt/biblioteca"} onClick={(event) => { event.preventDefault(); onLibrary(); }}>
                <Bookmark size={16} />{" " + t("Biblioteca") + " "}</a>
              <form method="post" action="/api/auth/logout">
                <input type="hidden" name="lang" value={locale} />
                <input type="hidden" name="next" value={home} />
                <button className="text-button" type="submit">{t("Sair")}</button>
              </form>
              <button className="avatar-button" onClick={onProfile}>
                <span>{user.name.charAt(0)}</span>
                {user.name.split(" ")[0]}
                <ChevronDown size={14} />
              </button>
            </>
          ) : (
            <>
              <a className="text-button" href={locale === "en" ? "/en/entrar" : "/pt/entrar"} onClick={(event) => { event.preventDefault(); onLogin(); }}>{" " + t("Entrar") + " "}</a>
              <a className="button small" href={locale === "en" ? "/en/register" : "/pt/cadastro"} onClick={(event) => { event.preventDefault(); onRegister(); }}>{" " + t("Criar conta grátis") + " "}<ArrowUpRight size={16} />
              </a>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
