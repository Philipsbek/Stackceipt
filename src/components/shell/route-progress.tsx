"use client";

import * as React from "react";
import { usePathname } from "next/navigation";

/**
 * A slim top progress bar that animates during page navigations. Next keeps the
 * current page on screen until the next one is ready, which can feel "stuck" on
 * slower routes — this gives immediate feedback that a click registered.
 *
 * It starts when an internal link is clicked and completes when the pathname
 * changes (with a safety timeout so it can never hang). Programmatic navigations
 * that already show their own button spinner don't need it.
 */
export function RouteProgress() {
  const pathname = usePathname();
  const [visible, setVisible] = React.useState(false);
  const [width, setWidth] = React.useState(0);

  const active = React.useRef(false);
  const trickle = React.useRef<ReturnType<typeof setInterval> | null>(null);
  const safety = React.useRef<ReturnType<typeof setTimeout> | null>(null);
  const hide = React.useRef<ReturnType<typeof setTimeout> | null>(null);
  const firstRender = React.useRef(true);

  const clearTimers = React.useCallback(() => {
    if (trickle.current) clearInterval(trickle.current);
    if (safety.current) clearTimeout(safety.current);
    trickle.current = null;
    safety.current = null;
  }, []);

  const finish = React.useCallback(() => {
    if (!active.current) return;
    active.current = false;
    clearTimers();
    setWidth(100);
    hide.current = setTimeout(() => {
      setVisible(false);
      setWidth(0);
    }, 250);
  }, [clearTimers]);

  const start = React.useCallback(() => {
    if (active.current) return;
    active.current = true;
    if (hide.current) clearTimeout(hide.current);
    setVisible(true);
    setWidth(8);
    // Creep toward 90% so the bar keeps moving while the route loads.
    trickle.current = setInterval(() => {
      setWidth((w) => (w < 90 ? Math.min(w + Math.random() * 12, 90) : w));
    }, 300);
    // Never hang: force-complete if the navigation takes too long or is cancelled.
    safety.current = setTimeout(() => finish(), 10000);
  }, [finish]);

  // Start the bar when an internal link is clicked.
  React.useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
      const anchor = (e.target as HTMLElement)?.closest?.("a");
      if (!anchor) return;
      const href = anchor.getAttribute("href");
      const targetAttr = anchor.getAttribute("target");
      if (!href || (targetAttr && targetAttr !== "_self")) return;
      if (!href.startsWith("/") || href.startsWith("//")) return; // internal only
      const url = new URL(href, window.location.origin);
      // Same URL = no navigation, so don't start (it would never complete).
      if (url.pathname === window.location.pathname && url.search === window.location.search) return;
      start();
    };
    document.addEventListener("click", onClick);
    return () => document.removeEventListener("click", onClick);
  }, [start]);

  // Also start on programmatic navigations (router.push), which don't emit a
  // click — patch history.pushState to catch them.
  React.useEffect(() => {
    const original = window.history.pushState;
    window.history.pushState = function (this: History, ...args: Parameters<History["pushState"]>) {
      const url = args[2];
      const nextPath = url ? new URL(url, window.location.origin).pathname : null;
      if (nextPath && nextPath !== window.location.pathname) start();
      return original.apply(this, args);
    };
    return () => {
      window.history.pushState = original;
    };
  }, [start]);

  // Complete the bar once the route actually changes.
  React.useEffect(() => {
    if (firstRender.current) {
      firstRender.current = false;
      return;
    }
    finish();
  }, [pathname, finish]);

  React.useEffect(() => () => clearTimers(), [clearTimers]);

  if (!visible) return null;

  return (
    <div aria-hidden className="pointer-events-none fixed inset-x-0 top-0 z-[100] h-0.5">
      <div
        className="h-full bg-foreground transition-[width,opacity] duration-200 ease-out"
        style={{ width: `${width}%`, opacity: width >= 100 ? 0 : 1 }}
      />
    </div>
  );
}
