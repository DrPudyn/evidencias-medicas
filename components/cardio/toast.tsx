"use client";
import { useLocale } from "@/components/locale-provider";

import { CheckCircle2, X } from "lucide-react";

export function Toast({ message, onClose }: { message: string; onClose: () => void }) {
  const { t } = useLocale();
  return (
    <div className="toast" role="status">
      <CheckCircle2 size={18} />
      {t(message)}
      <button onClick={onClose} aria-label={t("Fechar aviso")}>
        <X size={15} />
      </button>
    </div>
  );
}
