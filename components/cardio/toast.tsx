"use client";
import { useLocale } from "@/components/locale-provider";

import { CheckCircle2, X } from "lucide-react";

export function Toast({ message, onClose, onUndo, pending }: { message: string; onClose: () => void; onUndo?: () => void; pending?: boolean }) {
  const { t } = useLocale();
  return (
    <div className="toast" role="status">
      <CheckCircle2 size={18} />
      {t(message)}
      {onUndo && <button className="toast-undo" onClick={onUndo} disabled={pending}>{t(pending ? "Restaurando…" : "Desfazer")}</button>}
      <button onClick={onClose} aria-label={t("Fechar aviso")}>
        <X size={15} />
      </button>
    </div>
  );
}
