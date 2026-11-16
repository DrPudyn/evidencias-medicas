"use client";

async function ceremony(action: "login" | "register", name?: string) {
  const { startAuthentication, startRegistration } = await import("@simplewebauthn/browser");
  const optionsAction = action === "login" ? "login-options" : "register-options";
  const verifyAction = action === "login" ? "login-verify" : "register-verify";
  const started = await fetch("/api/auth/passkey", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ action: optionsAction, name }),
  });
  const payload = await started.json() as { error?: string; options: Record<string, unknown>; challengeId: string };
  if (!started.ok) throw new Error(payload.error || "Não foi possível iniciar a chave.");
  const response = action === "login" ? await startAuthentication({ optionsJSON: payload.options as never }) : await startRegistration({ optionsJSON: payload.options as never });
  const verified = await fetch("/api/auth/passkey", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ action: verifyAction, challengeId: payload.challengeId, response }),
  });
  const result = await verified.json() as { error?: string };
  if (!verified.ok) throw new Error(result.error || "A chave não foi aceita.");
}

export function PasskeyLogin() {
  return <button className="button secondary" type="button" onClick={() => { void ceremony("login").then(() => { window.location.href = "/pt"; }).catch((error: Error) => { window.alert(error.message); }); }}>Entrar com chave de acesso</button>;
}

export function PasskeyRegister() {
  return <form onSubmit={(event) => {
    event.preventDefault();
    const name = new FormData(event.currentTarget).get("name");
    void ceremony("register", String(name || "")).then(() => { window.location.href = "/pt"; }).catch((error: Error) => { window.alert(error.message); });
  }}>
    <label>Nome de exibição
      <input name="name" required minLength={2} maxLength={80} />
    </label>
    <button className="button secondary" type="submit">Criar conta com chave de acesso</button>
  </form>;
}

export function PasskeyManager() {
  return <button className="button secondary" type="button" onClick={() => { void ceremony("register").then(() => { window.location.reload(); }).catch((error: Error) => { window.alert(error.message); }); }}>Adicionar chave de acesso</button>;
}
