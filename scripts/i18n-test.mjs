import assert from "node:assert/strict";
import { test } from "node:test";
import fs from "node:fs";
import ts from "typescript";

function loadTypeScript(path) {
  const source = fs.readFileSync(new URL(path, import.meta.url), "utf8");
  const output = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.ESNext } }).outputText;
  return import("data:text/javascript;base64," + Buffer.from(output).toString("base64"));
}
const { resolveLocale } = await loadTypeScript("../lib/i18n/locale.ts");
const { prettyDate } = await loadTypeScript("../components/cardio/format.ts");
const { english } = await loadTypeScript("../lib/i18n/en.ts");

test("explicit language links override saved and browser preferences", () => {
  assert.equal(resolveLocale("en", "pt", "pt-BR"), "en");
  assert.equal(resolveLocale("pt", "en", "en-US"), "pt");
});
test("saved choices override browser language and invalid choices are ignored", () => {
  assert.equal(resolveLocale(null, "pt", "en-GB"), "pt");
  assert.equal(resolveLocale("fr", "en", "pt-BR"), "en");
  assert.equal(resolveLocale(null, null, "pt-PT"), "pt");
  assert.equal(resolveLocale(null, "invalid", "en-US"), "en");
});
test("partial publication dates retain their precision in both languages", () => {
  assert.equal(prettyDate("2024", "en"), "2024");
  assert.match(prettyDate("2024 Feb", "en"), /Feb/);
  assert.match(prettyDate("2024 Feb", "pt"), /fev/);
  assert.match(prettyDate("2024 Feb 04", "en"), /04/);
  assert.equal(prettyDate("not-a-date", "en"), "not-a-date");
});
test("essential journeys have English copy without changing scientific source content", () => {
  for (const key of ["Explorar artigos", "Filtrar artigos", "Ler no PubMed", "Criar conta grátis", "Privacidade", "Aceitar métricas de uso"]) {
    assert.ok(english[key]);
    assert.notEqual(english[key], key);
  }
  assert.ok(Object.values(english).every(value => typeof value === "string" && value.trim()));
});
