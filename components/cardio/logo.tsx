import { Activity } from "lucide-react";
import { BRAND_MARK, BRAND_NAME, BRAND_SHORT } from "@/lib/brand";

export function Logo() {
  return (
    <a className="brand" href="#inicio" aria-label={`${BRAND_NAME}, início`}>
      <span className="brand-icon">
        <Activity size={22} />
      </span>
      <span>
        {BRAND_SHORT}
        <span className="brand-second">
          {BRAND_MARK}
          <span className="brand-dot">.</span>
        </span>
      </span>
    </a>
  );
}
