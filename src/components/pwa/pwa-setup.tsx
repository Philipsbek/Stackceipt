"use client";

import * as React from "react";
import { ensureServiceWorker, pushSupported } from "@/lib/push/client";
import { setDeferredPrompt, type BeforeInstallPromptEvent } from "./install-state";

/**
 * Mounted once in the root layout. Registers the service worker (enabling
 * installability + push) and captures the Android install prompt for later use.
 * Renders nothing.
 */
export function PwaSetup() {
  React.useEffect(() => {
    if (pushSupported()) void ensureServiceWorker();

    const onBeforeInstall = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };
    const onInstalled = () => setDeferredPrompt(null);

    window.addEventListener("beforeinstallprompt", onBeforeInstall);
    window.addEventListener("appinstalled", onInstalled);
    return () => {
      window.removeEventListener("beforeinstallprompt", onBeforeInstall);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);

  return null;
}
