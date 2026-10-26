"use client";

export function AccountConsent({ checked, onChange }: { checked: boolean; onChange: (value: boolean) => void }) {
  return (
    <>
      <label className="check-label consent">
        <input type="checkbox" checked={checked} onChange={(event) => onChange(event.target.checked)} required />
        <span>Entendi que meus dados serão usados para criar e manter minha conta. Notificações são opcionais.</span>
      </label>
      <details className="privacy-inline">
        <summary>Como meus dados são usados?</summary>
        <p>Nome, e-mail, CRM/UF ou faculdade/estado identificam seu perfil. O telefone é opcional. Na prévia local, os dados ficam no banco do projeto; use dados fictícios. O CRM é autodeclarado. As preferências podem ser alteradas na conta.</p>
      </details>
    </>
  );
}
