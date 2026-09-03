import type { Metadata } from "next";
import { GeistSans } from "geist/font/sans";
import { GeistMono } from "geist/font/mono";
import { Toaster } from "@/components/ui/sonner";
import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: "Stackceipt — Know what your software stack is costing you.",
    template: "%s · Stackceipt",
  },
  description:
    "Stackceipt gives operators one reliable place to track software subscriptions, renewals, approvals, reviews, and cost-control findings.",
  applicationName: "Stackceipt",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={`${GeistSans.variable} ${GeistMono.variable}`}>
      <body>
        {children}
        <Toaster />
      </body>
    </html>
  );
}
