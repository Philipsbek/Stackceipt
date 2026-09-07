import type { Metadata, Viewport } from "next";
import Script from "next/script";
import { GeistSans } from "geist/font/sans";
import { GeistMono } from "geist/font/mono";
import { Toaster } from "@/components/ui/sonner";
import { ChatBot } from "@/components/bot/chat-bot";
import { PwaSetup } from "@/components/pwa/pwa-setup";
import { RouteProgress } from "@/components/shell/route-progress";
import { ThemeProvider } from "@/components/theme/theme-provider";
import "./globals.css";

// Applies the saved dark preference before first paint (only inside /app), so
// the app never flashes light on load. Kept in sync with ThemeProvider.
const themeBootScript = `(function(){try{var t=localStorage.getItem("stackceipt-theme");if(t==="dark"&&location.pathname.indexOf("/app")===0){document.documentElement.classList.add("dark")}}catch(e){}})();`;

export const metadata: Metadata = {
  title: {
    default: "Stackceipt — Know what your software stack is costing you.",
    template: "%s · Stackceipt",
  },
  description:
    "Stackceipt gives operators one reliable place to track software subscriptions, renewals, approvals, reviews, and cost-control findings.",
  applicationName: "Stackceipt",
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Stackceipt",
    // iOS home-screen launch screens, so opening the app shows a branded splash
    // instead of a blank screen. One image per common iPhone size (portrait).
    startupImage: (
      [
        [375, 667, 2], [414, 736, 3], [375, 812, 3], [414, 896, 2], [414, 896, 3],
        [390, 844, 3], [428, 926, 3], [393, 852, 3], [430, 932, 3], [402, 874, 3], [440, 956, 3],
      ] as [number, number, number][]
    ).map(([w, h, r]) => ({
      url: `/splash/splash-${w}x${h}-${r}x.png`,
      media: `(device-width: ${w}px) and (device-height: ${h}px) and (-webkit-device-pixel-ratio: ${r}) and (orientation: portrait)`,
    })),
  },
};

export const viewport: Viewport = {
  themeColor: "#101012",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={`${GeistSans.variable} ${GeistMono.variable}`}>
      <head>
        <Script id="theme-boot" strategy="beforeInteractive">
          {themeBootScript}
        </Script>
      </head>
      <body>
        <RouteProgress />
        <ThemeProvider>{children}</ThemeProvider>
        <ChatBot />
        <PwaSetup />
        <Toaster />
      </body>
    </html>
  );
}
