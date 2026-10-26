"use client";

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
  return (
    <header className="header">
      <div className="container nav">
        <Logo />
        <nav aria-label="Navegação principal">
          <a href="#explorar">Explorar artigos</a>
          <button onClick={onGuide}>Guia de busca</button>
          <a href="#recursos">A plataforma</a>
        </nav>
        <div className="nav-actions">
          {user ? (
            <>
              {user.role === "admin" && (
                <a className="text-button" href="/admin">
                  <ShieldCheck size={16} /> Painel administrativo
                </a>
              )}
              <button className="text-button library-nav" onClick={onLibrary}>
                <Bookmark size={16} /> Biblioteca
              </button>
              <button className="avatar-button" onClick={onProfile}>
                <span>{user.name.charAt(0)}</span>
                {user.name.split(" ")[0]}
                <ChevronDown size={14} />
              </button>
            </>
          ) : (
            <>
              <button className="text-button" onClick={onLogin}>
                Entrar
              </button>
              <button className="button small" onClick={onRegister}>
                Criar conta grátis <ArrowUpRight size={16} />
              </button>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
