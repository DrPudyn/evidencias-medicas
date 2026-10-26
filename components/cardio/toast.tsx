"use client";

import { CheckCircle2, X } from "lucide-react";

export function Toast({ message, onClose }: { message: string; onClose: () => void }) {
  return (
    <div className="toast" role="status">
      <CheckCircle2 size={18} />
      {message}
      <button onClick={onClose} aria-label="Fechar aviso">
        <X size={15} />
      </button>
    </div>
  );
}
