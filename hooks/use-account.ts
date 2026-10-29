"use client";
import { useLocale } from "@/components/locale-provider";

import { useEffect, useState, type FormEvent } from "react";
import type { Article } from "@/lib/catalog";
import { trackClinicalEvent } from "@/lib/analytics-client";
import { api } from "@/components/cardio/api";
import { blankProfile, type AppModal, type Profile } from "@/components/cardio/types";

type AccountEnv = {
  tab: string;
  specialty: string;
  setTab: (tab: string) => void;
  setModal: (modal: AppModal) => void;
  setToast: (toast: string) => void;
};

export function useAccount({ tab, specialty, setTab, setModal, setToast }: AccountEnv) {
  const { t } = useLocale();
  const [user, setUser] = useState<Profile | null>(null);
  const [saved, setSaved] = useState<Article[]>([]);
  const [saving, setSaving] = useState("");
  const [mode, setMode] = useState("register");
  const [profile, setProfile] = useState<Profile>({ ...blankProfile });
  const [step, setStep] = useState(1);
  const [code, setCode] = useState("");
  const [previewCode, setPreviewCode] = useState("");
  const [consent, setConsent] = useState(false);
  const [busy, setBusy] = useState(false);
  const [formError, setFormError] = useState("");
  const [cooldown, setCooldown] = useState(0);

  useEffect(() => {
    api<{ user: Profile | null }>("/api/account")
      .then((data) => {
        setUser(data.user);
        if (data.user) {
          api<{ articles: Article[] }>("/api/bookmarks")
            .then((bookmarks) => setSaved(bookmarks.articles))
            .catch(() => {});
        }
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (cooldown <= 0) return;
    const timer = setTimeout(() => setCooldown(cooldown - 1), 1000);
    return () => clearTimeout(timer);
  }, [cooldown]);

  const updateProfile = (key: keyof Profile, value: Profile[keyof Profile]) => setProfile((current) => ({ ...current, [key]: value }));

  function openAuth(nextMode = "register") {
    setMode(nextMode);
    setProfile({ ...blankProfile });
    setStep(1);
    setFormError("");
    setPreviewCode("");
    setCode("");
    setConsent(false);
    setModal("auth");
  }

  function openProfile() {
    if (!user) {
      openAuth();
      return;
    }
    setProfile({ ...user });
    setFormError("");
    setModal("profile");
  }

  async function toggleSaved(article: Article) {
    if (!user) {
      openAuth("login");
      return;
    }
    setSaving(article.id);
    try {
      if (saved.some((item) => item.id === article.id)) {
        await api(`/api/bookmarks?id=${article.id}`, { method: "DELETE" });
        setSaved((items) => items.filter((item) => item.id !== article.id));
        setToast("Artigo removido da biblioteca.");
      } else {
        await api("/api/bookmarks", { method: "POST", body: JSON.stringify(article) });
        trackClinicalEvent("bookmark", article.topic, article.source || "PubMed");
        setSaved((items) => [article, ...items]);
        setToast("Artigo salvo na sua biblioteca.");
      }
    } catch (failure) {
      setToast((failure as Error).message);
    } finally {
      setSaving("");
    }
  }

  async function requestCode(event?: FormEvent) {
    event?.preventDefault();
    setBusy(true);
    setFormError("");
    try {
      const data = await api<{ previewCode?: string }>("/api/auth/request", {
        method: "POST",
        body: JSON.stringify({ ...profile, mode, privacyConsent: consent }),
      });
      setPreviewCode(data.previewCode || "");
      setStep(2);
      setCooldown(60);
    } catch (failure) {
      setFormError((failure as Error).message);
    } finally {
      setBusy(false);
    }
  }

  async function verify(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setFormError("");
    try {
      const data = await api<{ user: Profile }>("/api/auth/verify", {
        method: "POST",
        body: JSON.stringify({ email: profile.email, code }),
      });
      setUser(data.user);
      setModal(null);
      setToast("Bem-vindo! Sua conta está pronta.");
      const bookmarks = await api<{ articles: Article[] }>("/api/bookmarks");
      setSaved(bookmarks.articles);
    } catch (failure) {
      setFormError((failure as Error).message);
    } finally {
      setBusy(false);
    }
  }

  async function saveProfile(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setFormError("");
    try {
      const data = await api<{ user: Profile }>("/api/account", { method: "PATCH", body: JSON.stringify(profile) });
      setUser(data.user);
      setModal(null);
      setToast("Perfil e preferências salvos.");
    } catch (failure) {
      setFormError((failure as Error).message);
    } finally {
      setBusy(false);
    }
  }

  async function logout() {
    try {
      await api("/api/account", { method: "DELETE" });
      setUser(null);
      setSaved([]);
      setModal(null);
      if (tab === "saved") setTab(specialty ? "collection" : "live");
      setToast("Você saiu da sua conta.");
    } catch {
      setFormError("Não foi possível sair. Tente novamente.");
    }
  }

  async function deleteAccount() {
    if (!window.confirm(t("Excluir sua conta apagará seu perfil, favoritos e sessões. Essa ação não pode ser desfeita. As métricas já agregadas e sem vínculo com a conta não serão alteradas."))) return;
    setBusy(true);
    try {
      await api("/api/account/delete", { method: "DELETE", body: JSON.stringify({ confirmation: "EXCLUIR MINHA CONTA" }) });
      setUser(null);
      setSaved([]);
      setModal(null);
      setToast("Sua conta e seus favoritos foram excluídos.");
    } catch (failure) {
      setFormError((failure as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return {
    user,
    saved,
    saving,
    mode,
    setMode,
    profile,
    updateProfile,
    step,
    setStep,
    code,
    setCode,
    previewCode,
    consent,
    setConsent,
    busy,
    formError,
    setFormError,
    cooldown,
    openAuth,
    openProfile,
    toggleSaved,
    requestCode,
    verify,
    saveProfile,
    logout,
    deleteAccount,
  };
}

export type AccountController = ReturnType<typeof useAccount>;
