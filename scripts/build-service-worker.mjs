import { createHash } from "node:crypto";
import { readFile, readdir, writeFile } from "node:fs/promises";

const root = new URL("../dist/client/", import.meta.url);
const assets = ["/favicon.svg", "/icons/icon-180.png", "/icons/icon-192.png", "/icons/icon-512.png"];
async function collect(directory) {
  for (const entry of await readdir(new URL(directory, root), { withFileTypes: true })) {
    const path = `${directory}${entry.name}`;
    if (entry.isDirectory()) await collect(`${path}/`);
    else if (/\.(?:js|css|woff2?|ttf|otf|png|svg|webp|jpe?g|ico)$/.test(path)) assets.push(`/${path}`);
  }
}
await collect("_next/static/");
assets.sort();
const source = await readFile(new URL("../public/sw.js", import.meta.url), "utf8");
const hash = createHash("sha256").update(source);
for (const asset of assets) hash.update(await readFile(new URL(asset.slice(1), root)));
await writeFile(new URL("sw.js", root), source
  .replace(/const STATIC_ASSETS = .*;/, `const STATIC_ASSETS = ${JSON.stringify(assets)};`)
  .replace('"em-static-dev"', `"em-static-${hash.digest("hex").slice(0, 16)}"`));
console.log(`Service worker: ${assets.length} static assets; no documents or API responses.`);
