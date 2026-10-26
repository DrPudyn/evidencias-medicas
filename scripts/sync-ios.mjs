import { spawnSync } from "node:child_process";

if (!process.env.CAPACITOR_SERVER_URL?.trim()) {
  throw new Error("Defina CAPACITOR_SERVER_URL com a URL HTTPS publicada antes de sincronizar o iOS.");
}
const result = spawnSync(process.execPath, ["node_modules/@capacitor/cli/bin/capacitor", "sync", "ios"], { stdio: "inherit" });
if (result.error) throw result.error;
process.exitCode = result.status ?? 1;
