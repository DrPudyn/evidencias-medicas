import assert from "node:assert/strict";
import { test } from "node:test";
import fs from "node:fs";
import ts from "typescript";

async function loadTypeScript(file) {
  const source = fs.readFileSync(new URL(file, import.meta.url), "utf8");
  const { outputText } = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.ESNext } });
  return import("data:text/javascript;base64," + Buffer.from(outputText).toString("base64"));
}
const { defaultBrowse, sanitizeBrowse, browseFromLink, searchLink } = await loadTypeScript("../lib/browse-state.ts");
const { replacementFor } = await loadTypeScript("../lib/replacement.ts");

test("shared searches round-trip actual queries and every public filter without draft or account data", () => {
  const state = { ...defaultBrowse, query: "insuficiência cardíaca AND (SGLT2 OR empagliflozin)", draft: "texto ainda não pesquisado", specialty: "cardiology", topic: "heart-failure", type: "rct", period: "365", guidelineYear: "2024", free: true, sort: "relevance", page: 4 };
  const link = new URL(searchLink("https://example.test/pt?reset=secret&email=private#account", "en", { ...state, notes: "private notes", userId: "private-id", token: "secret" }));
  assert.equal(link.pathname, "/en");
  assert.equal(link.hash, "#explorar");
  assert.ok(!link.href.includes("private") && !link.href.includes("secret") && !link.href.includes("pesquisado"));
  assert.deepEqual(browseFromLink(link), { ...state, draft: state.query });
});

test("ordinary pages do not override stored searches and malformed settings cannot produce invalid state", () => {
  assert.equal(browseFromLink(new URL("https://example.test/pt?q=ignored")), null);
  assert.deepEqual(sanitizeBrowse(null), defaultBrowse);
  const input = sanitizeBrowse({ page: Infinity, free: "true", tab: "admin", sort: "bad", period: "-1", query: "x".repeat(300), guidelineYear: "<script>" });
  assert.equal(input.page, 1); assert.equal(input.free, false); assert.equal(input.tab, "live");
  assert.equal(input.query.length, 200); assert.equal(input.period, "all"); assert.equal(input.guidelineYear, "all");
  assert.equal(browseFromLink(new URL("https://example.test/pt?search=1&tab=saved&page=-2" )).tab, "live");
  assert.equal(new URL(searchLink("https://example.test", "pt", { ...defaultBrowse, tab: "saved" })).searchParams.get("tab"), "live");
});

test("catalog searches keep source, document type and year in shared links", () => {
  const state = { ...defaultBrowse, tab: "sbc", specialty: "cardiology", query: "hipertensão", draft: "hipertensão", type: "Posicionamento", guidelineYear: "2025" };
  assert.deepEqual(browseFromLink(new URL(searchLink("https://example.test", "pt", state))), state);
});

test("replacement warnings require an explicit published editorial record, never an inferred publication year", () => {
  const catalog = [{ id: "old", title: "Old", url: "https://society.test/old" }, { id: "new", title: "Canonical replacement", url: "https://society.test/new" }];
  assert.equal(replacementFor("old", [], catalog), null);
  assert.equal(replacementFor("old", [{ articleId: "old", supersededBy: "new", status: "draft" }], catalog), null);
  assert.equal(replacementFor("old", [{ articleId: "old", supersededBy: "old", status: "published" }], catalog), null);
  const review = { articleId: "old", supersededBy: "new", status: "published" };
  assert.deepEqual(replacementFor("old", [review], catalog), { id: "new", title: "Canonical replacement", url: "https://society.test/new" });
  assert.equal(replacementFor("old", [{ ...review, supersededBy: "https://phishing.test" }], catalog), null);
  assert.equal(replacementFor("old", [{ ...review, supersededBy: "12345678" }], catalog).url, "https://pubmed.ncbi.nlm.nih.gov/12345678/");
});
