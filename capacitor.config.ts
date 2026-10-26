import type { CapacitorConfig } from "@capacitor/cli";

// Read at `cap sync` time. Never guess a deployment URL or bundle a local session.
// Empty is allowed only to generate/open the native scaffold; sync requires HTTPS.
const serverUrl = process.env.CAPACITOR_SERVER_URL?.trim();
if (serverUrl) {
  const url = new URL(serverUrl);
  if (url.protocol !== "https:" || url.username || url.password || url.search || url.hash) {
    throw new Error("CAPACITOR_SERVER_URL deve ser uma URL HTTPS sem credenciais, query ou fragmento.");
  }
}

const config: CapacitorConfig = {
  // Provisional identifier: confirm ownership/availability before App Store signing.
  appId: "com.drpudyn.evidenciasmedicas",
  appName: "Evidências Médicas",
  // Native bootstrap only: this server-rendered portal cannot be exported as HTML.
  webDir: "capacitor-web",
  ...(serverUrl ? { server: { url: serverUrl, cleartext: false } } : {}),
};

export default config;
