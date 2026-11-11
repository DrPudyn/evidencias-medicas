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
  referrer: "no-referrer",
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
        <script dangerouslySetInnerHTML={{ __html: "document.documentElement.classList.add('js')" }} />
        <LocaleProvider initialLocale={locale}>{children}<InstallApp /></LocaleProvider>
      </body>
    </html>
  );
}
