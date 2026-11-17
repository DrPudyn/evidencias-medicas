export default async function ResetPassword({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const query = await searchParams;
  const token = typeof query.token === "string" ? query.token : "";
  return (
    <main className="auth-page container">
      <h1>Defina uma nova senha</h1>
      <p>O link vale por 30 minutos e só pode ser usado uma vez.</p>
      <form className="auth-fields" method="post" action="/api/auth/reset">
        <input type="hidden" name="token" value={token} />
        <label>Nova senha
          <input type="password" name="password" required minLength={12} maxLength={128} autoComplete="new-password" />
        </label>
        <button className="button" type="submit">Salvar senha</button>
      </form>
    </main>
  );
}
