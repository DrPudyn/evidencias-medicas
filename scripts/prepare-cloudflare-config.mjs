import { existsSync, readFileSync, writeFileSync } from "node:fs";

const generatedPath = "dist/server/wrangler.json";
if (!existsSync(generatedPath)) {
  console.error("Rode npm run build antes. O Wrangler gerado pelo Vinext ainda não existe.");
  process.exit(1);
}

const base = JSON.parse(readFileSync(generatedPath, "utf8"));
const databaseId = process.env.CLOUDFLARE_D1_ID || "REPLACE_WITH_D1_DATABASE_ID";
const vars = {
  ...(base.vars || {}),
  SITE_ORIGIN: process.env.SITE_ORIGIN || "https://evidencias-medicas.edsoncarvalho9.workers.dev",
  PLAN_PRICE_LABEL: process.env.PLAN_PRICE_LABEL || "R$ 29–49",
  WORKERS_AI_MODEL: process.env.WORKERS_AI_MODEL || "@cf/meta/llama-3.1-8b-instruct-fast",
  CLINICAL_AI_PROVIDER: "workers-ai",
};
delete vars.LOCAL_PREVIEW_ENABLED;
for (const key of Object.keys(vars)) {
  if (/SECRET|API_KEY|PASSWORD/i.test(key)) delete vars[key];
}

delete base.configPath;
delete base.userConfigPath;
delete base.topLevelName;
const config = {
  ...base,
  name: "evidencias-medicas",
  workers_dev: true,
  d1_databases: [{
    binding: "DB",
    database_name: "evidencias-medicas",
    database_id: databaseId,
  }],
  ai: { binding: "AI" },
  vars,
};
const out = "dist/server/wrangler.production.json";
writeFileSync(out, `${JSON.stringify(config, null, 2)}\n`);
console.log(`Configuração de produção escrita em ${out}.`);
console.log("Secrets (somente nomes; use wrangler secret put, nunca o Git):");
for (const name of ["STRIPE_SECRET_KEY", "STRIPE_WEBHOOK_SECRET", "STRIPE_PRICE_ID"]) console.log(` - ${name}`);
if (databaseId === "REPLACE_WITH_D1_DATABASE_ID") {
  console.log("CLOUDFLARE_D1_ID ainda é o placeholder. Confira o id com: npx wrangler d1 list");
}
