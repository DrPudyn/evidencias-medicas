import assert from "node:assert/strict";
import { readFile, readdir } from "node:fs/promises";
import path from "node:path";
import { Miniflare } from "miniflare";
import { projectRoot } from "./sites-env.mjs";

const root = path.join(projectRoot, "dist/server");
const config = JSON.parse(await readFile(path.join(root, "wrangler.json"), "utf8"));
const entry = path.resolve(root, config.main);
const modules = (await readdir(root, { recursive: true }))
  .filter((file) => /\.(m?js)$/.test(file))
  .map((file) => ({ type: "ESModule", path: path.join(root, file) }))
  .sort((a, b) => Number(b.path === entry) - Number(a.path === entry));

const worker = new Miniflare({
  modules,
  modulesRoot: root,
  compatibilityDate: config.compatibility_date,
  compatibilityFlags: config.compatibility_flags,
  d1Databases: Object.fromEntries(config.d1_databases.map((db) => [db.binding, db.database_id])),
  d1Persist: process.env.SMOKE_DB_DIR || path.join(projectRoot, ".sites-runtime/ci-d1/v3/d1"),
  cf: false,
  host: "127.0.0.1",
  port: 0,
  bindings: { LOCAL_PREVIEW_ENABLED: "false" },
});

const query = "heart failure SGLT2";
try {
  const origin = (await worker.ready).origin;
  const pageUrl = `${origin}/pt?search=1&q=${encodeURIComponent(query)}&specialty=cardiology`;
  const page = await fetch(pageUrl, { signal: AbortSignal.timeout(90000) });
  const html = await page.text();
  assert.equal(page.status, 200, "SSR search page");
  assert.doesNotMatch(html, /Não foi possível consultar o PubMed/, html.slice(0, 500));
  assert.match(html, /article-title/, "Results are in the HTML without JavaScript");
  assert.match(html, /heart failure|Heart Failure|SGLT2|empagliflozin/i, "The search term is reflected in the rendered results");
  assert.match(html, /src="\/_next\/static\/chunks\/[^"]+\.js"/, "The page references the client bundle");

  const api = await fetch(`${origin}/api/articles?q=${encodeURIComponent(query)}&specialty=cardiology`, { signal: AbortSignal.timeout(90000) });
  const body = await api.json();
  assert.equal(api.status, 200, JSON.stringify(body).slice(0, 400));
  assert.ok(Array.isArray(body.articles) && body.articles.length > 0, "Client API returns articles");
  assert.ok(body.count > 0, "PubMed count is greater than zero");
  console.log(`PASS: "${query}" SSR HTML and API, ${body.articles.length} of ${body.count}.`);
} finally {
  await worker.dispose();
}
