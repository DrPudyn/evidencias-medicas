"use client";
import { useLocale } from "@/components/locale-provider";
import { useEffect, useState, useSyncExternalStore } from "react";
import { trackClinicalEvent } from "@/lib/analytics-client";

const CONSENT_KEY = "em-analytics-consent";
const MANAGE_EVENT = "em:manage-analytics";
const SSR_SENTINEL = "ssr";

const consentListeners = new Set<() => void>();

function subscribeConsent(onStoreChange: () => void) {
  consentListeners.add(onStoreChange);
  const onStorage = (event: StorageEvent) => {
    if (event.key === CONSENT_KEY || event.key === null) onStoreChange();
  };
  window.addEventListener("storage", onStorage);
  return () => {
    consentListeners.delete(onStoreChange);
    window.removeEventListener("storage", onStorage);
  };
}

function notifyConsentListeners() {
  for (const listener of consentListeners) listener();
}

function getConsentSnapshot() {
  return localStorage.getItem(CONSENT_KEY);
}

function getConsentServerSnapshot() {
  return SSR_SENTINEL;
}

export default function AnalyticsConsent() {
  const { t } = useLocale();
  const stored = useSyncExternalStore(
    subscribeConsent,
    getConsentSnapshot,
    getConsentServerSnapshot,
  );
  const [manageOpen, setManageOpen] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (stored === "yes") {
      void fetch("/api/analytics/consent", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ consent: true }),
      })
        .then(() => trackClinicalEvent("page_view"))
        .catch(() => {});
    } else if (stored === "no") {
      void fetch("/api/analytics/consent", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ consent: false }),
      }).catch(() => {});
    }
  }, [stored]);

  useEffect(() => {
    const manage = () => setManageOpen(true);
    window.addEventListener(MANAGE_EVENT, manage);
    return () => window.removeEventListener(MANAGE_EVENT, manage);
  }, []);

  const open =
    manageOpen ||
    (stored !== SSR_SENTINEL && stored !== "yes" && stored !== "no");

  async function choose(value: boolean) {
    setError("");
    try {
      const response = await fetch("/api/analytics/consent", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ consent: value }),
      });
      if (!response.ok) throw new Error();
      localStorage.setItem(CONSENT_KEY, value ? "yes" : "no");
      notifyConsentListeners();
      setManageOpen(false);
      if (value) trackClinicalEvent("page_view");
    } catch {
      setManageOpen(true);
      setError(t("Não foi possível salvar sua escolha agora. Tente novamente."));
    }
  }

  if (!open) return null;
  return (
    <aside
      className="analytics-consent"
      aria-label={t("Preferência de análise de uso")}
    >
      <div>
        <strong>{t("Ajude a melhorar o site?")}</strong>
        <p>{t("Com sua autorização, contamos eventos diários de página, buscas, filtros, abertura de referências e favoritos, agrupados por tema e fonte. Não guardamos os termos digitados nem o endereço IP, e não associamos métricas à sua conta. Identificadores pseudônimos são removidos na limpeza de até 180 dias; revogar remove esses identificadores, mas contagens já agregadas permanecem. Você pode recusar sem perder funções e alterar a escolha em “Gerenciar métricas de uso”.")}</p>
        {error && (
          <p className="analytics-error" role="alert">
            {error}
          </p>
        )}
      </div>
      <div className="analytics-actions">
        <button onClick={() => void choose(false)}>{t("Recusar")}</button>
        <button onClick={() => void choose(true)}>{t("Aceitar métricas de uso")}</button>
      </div>
    </aside>
  );
}
