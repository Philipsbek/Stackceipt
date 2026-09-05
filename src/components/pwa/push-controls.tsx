"use client";

import * as React from "react";
import { toast } from "sonner";
import { Bell, BellOff, Loader2, Download, Share, Plus } from "lucide-react";
import {
  pushSupported,
  notificationPermission,
  currentSubscription,
  subscribeThisDevice,
  unsubscribeThisDevice,
  isIOS,
  isStandalone,
} from "@/lib/push/client";
import { savePushSubscriptionAction, deletePushSubscriptionAction } from "@/lib/actions/push";
import { getDeferredPrompt, subscribeInstall } from "./install-state";

const VAPID_PUBLIC_KEY = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY ?? "";

export function PushControls({ orgSlug, isReadOnly }: { orgSlug: string; isReadOnly: boolean }) {
  const [supported, setSupported] = React.useState<boolean | null>(null);
  const [permission, setPermission] = React.useState<NotificationPermission | "unsupported">("default");
  const [subscribed, setSubscribed] = React.useState(false);
  const [busy, setBusy] = React.useState(false);
  const [canInstall, setCanInstall] = React.useState(false);
  const [showIosHelp, setShowIosHelp] = React.useState(false);

  const ios = isIOS();
  const standalone = isStandalone();

  React.useEffect(() => {
    const ok = pushSupported();
    setSupported(ok);
    if (!ok) return;
    setPermission(notificationPermission());
    void currentSubscription().then((s) => setSubscribed(Boolean(s)));

    setCanInstall(Boolean(getDeferredPrompt()));
    return subscribeInstall(() => setCanInstall(Boolean(getDeferredPrompt())));
  }, []);

  async function enable() {
    if (isReadOnly) {
      toast.error("Notifications aren't available in the read-only demo.");
      return;
    }
    // iOS only allows push once the app is installed to the home screen.
    if (ios && !standalone) {
      setShowIosHelp(true);
      return;
    }
    setBusy(true);
    try {
      const sub = await subscribeThisDevice(VAPID_PUBLIC_KEY);
      const result = await savePushSubscriptionAction(orgSlug, sub);
      if (result.error) throw new Error(result.error);
      setSubscribed(true);
      setPermission("granted");
      toast.success("Notifications on for this device.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not enable notifications.");
    } finally {
      setBusy(false);
    }
  }

  async function disable() {
    setBusy(true);
    try {
      const endpoint = await unsubscribeThisDevice();
      if (endpoint) await deletePushSubscriptionAction(orgSlug, endpoint);
      setSubscribed(false);
      toast.success("Notifications off for this device.");
    } catch {
      toast.error("Could not turn off notifications.");
    } finally {
      setBusy(false);
    }
  }

  async function install() {
    const prompt = getDeferredPrompt();
    if (!prompt) return;
    await prompt.prompt();
    await prompt.userChoice.catch(() => undefined);
  }

  if (supported === null) return null; // first render, before feature detection
  if (!supported && !ios) return null; // unsupported non-iOS browser: hide silently

  const blocked = permission === "denied";

  return (
    <div className="border-t border-border px-3 py-2.5">
      <div className="flex items-center justify-between gap-2">
        <div className="flex min-w-0 items-center gap-2">
          <span className="flex size-7 shrink-0 items-center justify-center rounded-lg bg-secondary text-muted-foreground">
            {subscribed ? <Bell className="size-3.5" /> : <BellOff className="size-3.5" />}
          </span>
          <span className="min-w-0">
            <span className="block text-xs font-medium text-foreground">Push notifications</span>
            <span className="block text-[11px] text-muted-foreground">
              {blocked
                ? "Blocked in browser settings"
                : subscribed
                  ? "On for this device"
                  : "Get renewals & alerts on this device"}
            </span>
          </span>
        </div>

        {!blocked ? (
          subscribed ? (
            <button
              type="button"
              onClick={disable}
              disabled={busy}
              className="shrink-0 rounded-md border border-border px-2.5 py-1 text-xs font-medium text-muted-foreground transition-colors hover:bg-secondary disabled:opacity-60"
            >
              {busy ? <Loader2 className="size-3.5 animate-spin" /> : "Turn off"}
            </button>
          ) : (
            <button
              type="button"
              onClick={enable}
              disabled={busy}
              className="shrink-0 rounded-md bg-[#171717] px-2.5 py-1 text-xs font-medium text-white transition-opacity hover:opacity-90 disabled:opacity-60"
            >
              {busy ? <Loader2 className="size-3.5 animate-spin" /> : "Enable"}
            </button>
          )
        ) : null}
      </div>

      {showIosHelp && ios && !standalone ? (
        <p className="mt-2 flex items-start gap-1.5 rounded-md bg-secondary/60 px-2.5 py-2 text-[11px] leading-relaxed text-muted-foreground">
          <Share className="mt-0.5 size-3.5 shrink-0" />
          <span>
            On iPhone, tap the <span className="font-medium text-foreground">Share</span> button, then{" "}
            <span className="font-medium text-foreground">Add to Home Screen</span>
            <Plus className="mx-0.5 inline size-3 align-[-1px]" />, then open Stackceipt from your home
            screen and enable notifications there.
          </span>
        </p>
      ) : null}

      {canInstall ? (
        <button
          type="button"
          onClick={install}
          className="mt-2 flex w-full items-center justify-center gap-1.5 rounded-md border border-border px-2.5 py-1.5 text-xs font-medium text-foreground transition-colors hover:bg-secondary"
        >
          <Download className="size-3.5" /> Install Stackceipt app
        </button>
      ) : null}
    </div>
  );
}
