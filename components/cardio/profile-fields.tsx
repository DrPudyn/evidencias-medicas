"use client";

import { useLocale } from "@/components/locale-provider";

import { Bell } from "lucide-react";
import { states } from "@/lib/catalog";
import type { Profile } from "@/components/cardio/types";

export function ProfileFields({
  profile,
  onChange,
}: {
  profile: Profile;
  onChange: (key: keyof Profile, value: Profile[keyof Profile]) => void;
}) {
  const { t } = useLocale();
  const doctor = profile.role === "doctor";
  return (
    <>
      <label>{" " + t("Nome completo") + " "}<input autoComplete="name" value={profile.name} onChange={(event) => onChange("name", event.target.value)} required minLength={3} maxLength={100} placeholder={t("Como podemos chamar você?")} />
      </label>
      {profile.role !== "admin" && (
        <div className="form-row">
          <label>
            {doctor ? t("Número do CRM") : t("Faculdade")}
            <input
              value={doctor ? profile.crm : profile.college}
              onChange={(event) => onChange(doctor ? "crm" : "college", event.target.value)}
              required
              inputMode={doctor ? "numeric" : "text"}
              pattern={doctor ? "[0-9]{3,8}" : undefined}
              maxLength={doctor ? 8 : 160}
              minLength={3}
              placeholder={doctor ? t("Somente números") : t("Nome da instituição")}
            />
          </label>
          <label className="state-field">
            {doctor ? t("UF do CRM") : t("Estado")}
            <select required value={profile.state} onChange={(event) => onChange("state", event.target.value)}>
              <option value="">UF</option>
              {states.map((state) => (
                <option key={state}>{state}</option>
              ))}
            </select>
          </label>
        </div>
      )}
      <label>
        WhatsApp <span className="optional">{t("opcional")}</span>
        <input
          autoComplete="tel"
          type="tel"
          value={profile.phone}
          onChange={(event) => onChange("phone", event.target.value)}
          placeholder="(11) 99999-9999"
          maxLength={20}
          required={profile.whatsappNotifications}
        />
      </label>
      <div className="preferences">
        <p>
          <Bell size={16} />{" " + t("Suas preferências de atualização") + " "}</p>
        <label className="check-label">
          <input type="checkbox" checked={profile.emailNotifications} onChange={(event) => onChange("emailNotifications", event.target.checked)} />
          <span>{t("Quero receber novidades por e-mail.")}</span>
        </label>
        <label className="check-label">
          <input type="checkbox" checked={profile.whatsappNotifications} onChange={(event) => onChange("whatsappNotifications", event.target.checked)} />
          <span>{t("Autorizo notificações pelo WhatsApp.")}</span>
        </label>
        <small>{t("Você pode alterar essas escolhas a qualquer momento. O envio de notificações será ativado em uma próxima etapa.")}</small>
      </div>
    </>
  );
}
