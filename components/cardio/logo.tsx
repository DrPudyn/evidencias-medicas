import { Activity } from "lucide-react";

export function Logo() {
  return (
    <a className="brand" href="#inicio" aria-label="Evidências Médicas, início">
      <span className="brand-icon">
        <Activity size={24} />
      </span>
      <span>
        Evidências
        <span className="brand-second">
          Médicas
          <span className="brand-dot">.</span>
        </span>
      </span>
    </a>
  );
}
