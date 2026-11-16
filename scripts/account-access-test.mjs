import assert from "node:assert/strict";
import test from "node:test";
import { RESET_NOTICE, RESET_TTL_MS, relyingParty, resetExpiry } from "../lib/account-access";

test("o link de senha expira em 30 minutos e a resposta não revela o e-mail", () => {
  const now = 1_700_000_000_000;
  assert.equal(resetExpiry(now) - now, RESET_TTL_MS);
  assert.equal(RESET_TTL_MS, 30 * 60 * 1000);
  assert.doesNotMatch(RESET_NOTICE, /não encontr|não existe|unknown/i);
});

test("o rpID da passkey sai do host da requisição ou do SITE_ORIGIN no mesmo host", () => {
  assert.deepEqual(relyingParty("https://evidencias-medicas.edsoncarvalho9.workers.dev"), {
    origin: "https://evidencias-medicas.edsoncarvalho9.workers.dev",
    rpID: "evidencias-medicas.edsoncarvalho9.workers.dev",
  });
  assert.equal(relyingParty("https://busca.exemplo.com", "https://busca.exemplo.com").rpID, "busca.exemplo.com");
  assert.equal(relyingParty("https://evidencias-medicas.edsoncarvalho9.workers.dev", "https://busca.exemplo.com").rpID, "evidencias-medicas.edsoncarvalho9.workers.dev");
});
