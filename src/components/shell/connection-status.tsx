"use client";

import * as React from "react";
import { Badge } from "@/components/ui/badge";

type Status = "connected" | "reconnecting" | "offline";

const CONFIG: Record<Status, { label: string; color: string; pulse: boolean }> = {
  connected: { label: "Connected", color: "var(--success)", pulse: false },
  reconnecting: { label: "Reconnecting…", color: "var(--warning)", pulse: true },
  offline: { label: "Offline", color: "var(--danger)", pulse: false },
};

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const PING_INTERVAL_MS = 30_000;

/**
 * Is the Supabase backend reachable? A normal CORS fetch to the public auth
 * health endpoint (with the anon key, which the endpoint requires) returns a
 * readable 200 — so we can trust res.ok, and a rejected promise means a real
 * network failure. Nothing sensitive is sent or read.
 */
async function pingBackend(signal: AbortSignal): Promise<boolean> {
  if (!SUPABASE_URL || !SUPABASE_KEY) return true; // Nothing to check against — don't cry wolf.
  try {
    const res = await fetch(`${SUPABASE_URL}/auth/v1/health`, {
      headers: { apikey: SUPABASE_KEY },
      cache: "no-store",
      signal,
    });
    return res.ok;
  } catch {
    return false;
  }
}

export function ConnectionStatus() {
  const [status, setStatus] = React.useState<Status>("connected");

  React.useEffect(() => {
    let cancelled = false;
    let controller: AbortController | null = null;

    async function check() {
      // navigator.onLine is the fast, authoritative "no network" signal.
      if (typeof navigator !== "undefined" && !navigator.onLine) {
        if (!cancelled) setStatus("offline");
        return;
      }
      controller?.abort();
      controller = new AbortController();
      const reachable = await pingBackend(controller.signal);
      if (cancelled) return;
      setStatus(reachable ? "connected" : "reconnecting");
    }

    check();
    const interval = setInterval(check, PING_INTERVAL_MS);

    const onOnline = () => {
      // Briefly show "reconnecting" while we confirm the backend is back.
      if (!cancelled) setStatus("reconnecting");
      check();
    };
    const onOffline = () => {
      if (!cancelled) setStatus("offline");
    };
    const onVisible = () => {
      if (document.visibilityState === "visible") check();
    };

    window.addEventListener("online", onOnline);
    window.addEventListener("offline", onOffline);
    document.addEventListener("visibilitychange", onVisible);

    return () => {
      cancelled = true;
      controller?.abort();
      clearInterval(interval);
      window.removeEventListener("online", onOnline);
      window.removeEventListener("offline", onOffline);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, []);

  const { label, color, pulse } = CONFIG[status];

  return (
    <Badge variant="soft" className="gap-1.5" aria-live="polite" title={`Workspace connection: ${label}`}>
      <span
        className={`size-1.5 rounded-full${pulse ? " animate-pulse" : ""}`}
        style={{ backgroundColor: color }}
      />
      {label}
    </Badge>
  );
}
