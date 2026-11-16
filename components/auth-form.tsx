import { RECOVERY_UNAVAILABLE, signInLink } from "@/lib/account-access";
import { safeNext } from "@/lib/safe-next";
import { PasskeyLogin, PasskeyRegister } from "@/components/passkey-actions";

export function AuthForm({
  lang,
  mode,
  error,
  email = "",
  notice = "",
  preview = "",
  recovery = true,
  next,
}: {
  lang: "pt" | "en";
  mode: "login" | "register";
  error: string;
  email?: string;
  notice?: string;
  preview?: string;
  recovery?: boolean;
  next: string;
}) {
  const en = lang === "en";
  const back = safeNext(next, en ? "/en" : "/pt");
  const taken = error.startsWith("Esse e-mail já tem conta.");
  const offerRecovery = error.includes("recuperação");
  const unavailableError = error === RECOVERY_UNAVAILABLE || error.startsWith("Recuperação por e-mail temporariamente");
  const loginHref = signInLink(lang, email);
  const accountHref = new URL(loginHref, "https://local");
  accountHref.searchParams.set("next", back);
  const accountLink = `${accountHref.pathname}${accountHref.search}`;
  return (
    <main className="auth-page container">
      <h1>{mode === "register" ? (en ? "Create your account" : "Crie sua conta") : (en ? "Sign in" : "Entre na sua conta")}</h1>
      <p>{mode === "register"
        ? (en ? "Create the account with email and password, or with a passkey on this device. No confirmation email is sent." : "Crie a conta com e-mail e senha, ou só com uma chave de acesso neste aparelho. Não enviamos confirmação por e-mail.")
        : (en ? "Sign in with email and password, or with a passkey on this device. No confirmation email is sent." : "Entre com e-mail e senha, ou com uma chave de acesso neste aparelho. Não enviamos confirmação por e-mail.")}</p>
      {taken ? (
        <p className="form-error" role="alert">
          {en ? "This email already has an account. Click " : "Esse e-mail já tem conta. Clique em "}
          <a href={loginHref}>{en ? "Sign in" : "Entrar"}</a>
          {offerRecovery ? (en ? " or use password recovery" : " ou use a recuperação de senha") : ""}.
        </p>
      ) : error && !unavailableError ? <p className="form-error" role="alert">{error}</p> : null}
      {notice ? <p role="status">{notice}</p> : null}
      {preview ? <p className="preview-code"><a href={preview}>{en ? "Local preview: open the reset link" : "Prévia local: abrir o link de redefinição"}</a></p> : null}
      <form className="auth-fields" method="post" action="/api/auth/form">
        <input type="hidden" name="lang" value={lang} />
        <input type="hidden" name="mode" value={mode} />
        <input type="hidden" name="next" value={back} />
        <label>{en ? "Email" : "E-mail"}
          <input type="email" name="email" autoComplete="email" required maxLength={254} defaultValue={email} />
        </label>
        <label>{en ? "Password" : "Senha"}
          <input type="password" name="password" autoComplete={mode === "register" ? "new-password" : "current-password"} required minLength={mode === "register" ? 12 : 1} maxLength={128} />
        </label>
        {mode === "register" ? (
          <label>{en ? "Confirm password" : "Confirme a senha"}
            <input type="password" name="confirmation" autoComplete="new-password" required minLength={12} maxLength={128} />
          </label>
        ) : null}
        <p className="muted small-text">{en ? "Use 12 to 128 characters." : "Use de 12 a 128 caracteres."}</p>
        <button className="button" type="submit">{mode === "register" ? (en ? "Create account" : "Criar conta") : (en ? "Sign in" : "Entrar")}</button>
      </form>
      {mode === "login" && recovery ? (
        <form className="auth-fields" method="post" action="/api/auth/reset">
          <input type="hidden" name="intent" value="request" />
          <input type="hidden" name="lang" value={lang} />
          <label>{en ? "Forgot your password" : "Esqueci minha senha"}
            <input type="email" name="email" autoComplete="email" required maxLength={254} defaultValue={email} />
          </label>
          <button className="button secondary" type="submit">{en ? "Send reset link" : "Enviar link"}</button>
        </form>
      ) : null}
      {mode === "login" && !recovery ? <p role="status">{en ? "Password recovery by email is not available yet." : RECOVERY_UNAVAILABLE}</p> : null}
      <PasskeyLogin />
      {mode === "register" ? <PasskeyRegister /> : null}
      <p className="auth-switch">
        {mode === "register"
          ? <a href={accountLink}>{en ? "I already have an account" : "Já tenho uma conta"}</a>
          : <a href={en ? `/en/register?next=${encodeURIComponent(back)}` : `/pt/cadastro?next=${encodeURIComponent(back)}`}>{en ? "Create an account" : "Criar conta"}</a>}
      </p>
    </main>
  );
}
