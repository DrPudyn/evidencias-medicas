import { spawnSync } from "node:child_process";

if (process.env.CONFIRM_DEPLOY !== "yes") {
  console.error("Deploy não executado. Este comando publicaria o Worker evidencias-medicas.");
  console.error("Para publicar de propósito: CONFIRM_DEPLOY=yes CLOUDFLARE_D1_ID=<id> npm run deploy:cf");
  process.exit(1);
}

const prepare = spawnSync(process.execPath, ["scripts/prepare-cloudflare-config.mjs"], { stdio: "inherit" });
if (prepare.status !== 0) process.exit(prepare.status ?? 1);

const deploy = spawnSync(process.execPath, [
  "node_modules/wrangler/bin/wrangler.js",
  "deploy",
  "--config",
  "dist/server/wrangler.production.json",
], { stdio: "inherit" });
process.exit(deploy.status ?? 1);
