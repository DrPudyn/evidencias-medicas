import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import vm from "node:vm";

const source = await readFile(new URL("../dist/client/sw.js", import.meta.url), "utf8");
const listeners = {};
const stored = new Map();
let networkCalls = 0;
let contentType = "image/png";
let cacheControl = "public";
const context = {
  URL, Set, Promise,
  self: { location: { origin: "https://portal.example.test" }, addEventListener: (name, listener) => { listeners[name] = listener; } },
  caches: {
    open: async () => ({ match: async (request) => stored.get(request.url), put: async (request, response) => { stored.set(request.url, response); } }),
    keys: async () => ["em-static-old", "other-app"],
    delete: async (name) => { assert.equal(name, "em-static-old"); return true; },
  },
  fetch: async () => {
    networkCalls++;
    return { ok: true, redirected: false, type: "basic", headers: new Headers({ "content-type": contentType, "cache-control": cacheControl }), clone() { return this; } };
  },
};
vm.runInNewContext(source, context);
async function request(path, options = {}) {
  let response;
  listeners.fetch({ request: { url: new URL(path, context.self.location.origin).href, method: "GET", mode: "cors", ...options }, respondWith: (promise) => { response = promise; } });
  if (response) await response;
  return response !== undefined;
}
for (const path of ["/", "/admin", "/api/account", "/api/bookmarks", "/api/articles?q=diabetes", "/api/articles/37952131", "https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esearch.fcgi", "/icons/icon-192.png?user=123", "/_next/static/not-in-this-build.js"]) {
  assert.equal(await request(path), false, path);
}
assert.equal(await request("/icons/icon-192.png", { method: "POST" }), false);
assert.equal(await request("/icons/icon-192.png", { mode: "navigate" }), false);
assert.equal(networkCalls, 0);
assert.equal(await request("/icons/icon-192.png"), true);
await request("/icons/icon-192.png");
assert.equal(networkCalls, 1, "second static request uses cache");
contentType = "application/json";
await request("/icons/icon-180.png");
assert.equal(stored.size, 1, "JSON must not be cached even at an allowed path");
contentType = "image/png";
cacheControl = "private, no-store";
await request("/icons/icon-512.png");
assert.equal(stored.size, 1, "private/no-store responses must not be cached");
let activated;
listeners.activate({ waitUntil: (promise) => { activated = promise; } });
await activated;
console.log("PASS: service worker ignores pages, API, PubMed, queries and unknown assets; caches only allowed static responses and removes only its old caches.");
