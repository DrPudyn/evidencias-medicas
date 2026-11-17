import assert from "node:assert/strict";
import test from "node:test";
import { EXISTING_ACCOUNT_NOTICE, RESET_NOTICE, RESET_TTL_MS, existingAccountMessage, relyingParty, resetExpiry, signInLink } from "../lib/account-access";
import { responseIsBlocked } from "../lib/api-guard";

test("o link de senha expira em 30 minutos e a resposta não revela o e-mail", () => {
  const now = 1_700_000_000_000;
  assert.equal(resetExpiry(now) - now, RESET_TTL_MS);
  assert.equal(RESET_TTL_MS, 30 * 60 * 1000);
  assert.doesNotMatch(RESET_NOTICE, /não encontr|não existe|unknown/i);
});

test("e-mail já cadastrado aponta para entrar e não oferece recuperação sem envio", () => {
  assert.equal(existingAccountMessage(false), EXISTING_ACCOUNT_NOTICE);
  assert.equal(EXISTING_ACCOUNT_NOTICE, "Esse e-mail já tem conta. Clique em Entrar.");
  assert.doesNotMatch(existingAccountMessage(false), /recupera/i);
  assert.match(existingAccountMessage(true), /Clique em Entrar/);
  assert.match(existingAccountMessage(true), /recuperação de senha/);
  assert.equal(signInLink("pt", "ana@example.com"), "/pt/entrar?email=ana%40example.com");
  assert.equal(signInLink("en"), "/en/entrar");
});

test("resposta sem JSON ou com redirect não é tratada como dado", () => {
  assert.equal(responseIsBlocked("text/html", false), true);
  assert.equal(responseIsBlocked("application/json", true), true);
  assert.equal(responseIsBlocked("application/json; charset=utf-8", false), false);
});

test("o rpID da passkey sai do host da requisição ou do SITE_ORIGIN no mesmo host", () => {
  assert.deepEqual(relyingParty("https://evidencias-medicas.edsoncarvalho9.workers.dev"), {
    origin: "https://evidencias-medicas.edsoncarvalho9.workers.dev",
    rpID: "evidencias-medicas.edsoncarvalho9.workers.dev",
  });
  assert.equal(relyingParty("https://busca.exemplo.com", "https://busca.exemplo.com").rpID, "busca.exemplo.com");
  assert.equal(relyingParty("https://evidencias-medicas.edsoncarvalho9.workers.dev", "https://busca.exemplo.com").rpID, "evidencias-medicas.edsoncarvalho9.workers.dev");
});
