import type { Metadata, Viewport } from "next";
import { GeistSans } from "geist/font/sans";
import { GeistMono } from "geist/font/mono";
import { Toaster } from "@/components/ui/sonner";
import { ChatBot } from "@/components/bot/chat-bot";
import { PwaSetup } from "@/components/pwa/pwa-setup";
import "./globals.css";

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
      <body>
        {children}
        <ChatBot />
        <PwaSetup />
        <Toaster />
      </body>
    </html>
  );
}
