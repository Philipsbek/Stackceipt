"use client";

import * as React from "react";
import { RefreshCw, Loader2, ArrowUpCircle } from "lucide-react";

/**
 * A refresh control that also detects when a newer deployment is live. It polls
 * /api/version and compares against the version the app loaded with; when they
 * differ it highlights itself as "Update". Clicking always reloads to the latest
 * (updating the service worker first).
 */
export function UpdateButton() {
  const loaded = React.useRef<string | null>(null);
  const [updateAvailable, setUpdateAvailable] = React.useState(false);
  const [busy, setBusy] = React.useState(false);

  React.useEffect(() => {
    let active = true;
    const check = async () => {
      try {
        const res = await fetch("/api/version", { cache: "no-store" });
        if (!res.ok) return;
        const { version } = (await res.json()) as { version?: string };
        if (!version || !active) return;
        if (loaded.current === null) {
          loaded.current = version; // baseline: the version we're running now
          return;
        }
        if (version !== loaded.current) setUpdateAvailable(true);
      } catch {
        // offline / transient — ignore and try again next tick
      }
    };
    check();
    const interval = setInterval(check, 60_000);
    const onFocus = () => check();
    window.addEventListener("focus", onFocus);
    return () => {
      active = false;
      clearInterval(interval);
      window.removeEventListener("focus", onFocus);
    };
  }, []);

  async function refresh() {
    setBusy(true);
    try {
      const reg = await navigator.serviceWorker?.getRegistration("/");
      await reg?.update();
    } catch {
      // no service worker — a plain reload still fetches the latest build
    }
    window.location.reload();
  }

  if (updateAvailable) {
    return (
      <button
        type="button"
        onClick={refresh}
        disabled={busy}
        title="A new version is available — click to update"
        aria-label="Update available — refresh to load the latest version"
        className="inline-flex h-8 items-center gap-1.5 rounded-lg bg-[color:var(--success-bg)] px-2.5 text-xs font-medium text-[color:var(--success)] transition-opacity hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-60"
      >
        {busy ? <Loader2 className="size-4 animate-spin" /> : <ArrowUpCircle className="size-4" />}
        Update
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={refresh}
      disabled={busy}
      title="Refresh to load the latest"
      aria-label="Refresh"
      className="flex size-8 items-center justify-center rounded-lg text-sidebar-muted transition-colors hover:bg-sidebar-accent hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
    >
      {busy ? <Loader2 className="size-4 animate-spin" /> : <RefreshCw className="size-4" />}
    </button>
  );
}
