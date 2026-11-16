import type { Metadata } from "next";
import { Fraunces, Manrope } from "next/font/google";
import { headers } from "next/headers";
import "./globals.css";
import "./premium.css";
import { LocaleProvider } from "@/components/locale-provider";
import InstallApp from "@/components/install-app";
import { BRAND_DESCRIPTION_PT, BRAND_NAME, BRAND_TITLE_PT } from "@/lib/brand";

const sans = Manrope({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-sans",
  weight: ["400", "500", "600", "700"],
});
const display = Fraunces({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-display",
  weight: ["500", "600", "700"],
});

export const metadata: Metadata = {
  title: BRAND_TITLE_PT,
  description: BRAND_DESCRIPTION_PT,
  applicationName: BRAND_NAME,
  referrer: "same-origin",
  icons: { icon: "/favicon.svg", apple: "/icons/apple-touch-icon.png" },
  manifest: "/manifest.webmanifest",
  appleWebApp: { capable: true, title: BRAND_NAME, statusBarStyle: "default" },
  robots: { index: false, follow: false },
  openGraph: {
    title: BRAND_NAME,
    description: BRAND_DESCRIPTION_PT,
    siteName: BRAND_NAME,
    locale: "pt_BR",
    type: "website",
  },
};
export const viewport = { width: "device-width", initialScale: 1, viewportFit: "cover", themeColor: "#f7f3ec" };

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const locale = (await headers()).get("x-site-locale") === "en" ? "en" : "pt";
  return (
    <html lang={locale === "en" ? "en" : "pt-BR"} className={`${sans.variable} ${display.variable}`}>
      <body>
        <script dangerouslySetInnerHTML={{ __html: `(function(){try{if(localStorage.getItem("em-theme")==="dark")document.documentElement.classList.add("theme-dark");}catch(e){}})();` }} />
        <script dangerouslySetInnerHTML={{ __html: `(function(){try{if(navigator.serviceWorker){navigator.serviceWorker.getRegistrations().then(function(list){list.forEach(function(item){item.unregister();});});}if(window.caches){caches.keys().then(function(keys){keys.forEach(function(key){caches.delete(key);});});}}catch(e){}var key="em-chunk-reload";function once(){try{if(sessionStorage.getItem(key))return;sessionStorage.setItem(key,"1");}catch(e){return;}var url=new URL(location.href);url.searchParams.set("cb",String(Date.now()));location.replace(url.toString());}window.addEventListener("error",function(event){var target=event.target;var message=String(event.message||"");var src=target&&target.src?String(target.src):"";if(message.indexOf("ChunkLoadError")>=0||message.indexOf("Loading chunk")>=0||(target&&target.tagName==="SCRIPT"&&/\\/(assets|_next)\\//.test(src)))once();},true);window.addEventListener("unhandledrejection",function(event){var reason=event.reason||"";var message=String(reason&&reason.message?reason.name+" "+reason.message:reason);if(message.indexOf("ChunkLoadError")>=0||message.indexOf("Loading chunk")>=0)once();});})();` }} />
        <LocaleProvider initialLocale={locale}>{children}<InstallApp /></LocaleProvider>
      </body>
    </html>
  );
}
