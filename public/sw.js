/*
 * Stackceipt service worker — PWA install + Web Push.
 *
 * Deliberately does NOT cache application data. Stackceipt shows live financial
 * figures (spend, renewals), so every request goes to the network as normal and
 * users never see stale numbers. This worker exists for two things only:
 *   1. Making the app installable (a registered service worker is required).
 *   2. Receiving background push notifications and routing taps back into the app.
 */

// Activate a new worker immediately instead of waiting for all tabs to close.
self.addEventListener("install", () => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});

// Present so the app meets install criteria. Network-only, no caching —
// we intentionally do not call respondWith, so the browser handles every
// request normally and live data stays fresh.
self.addEventListener("fetch", () => {});

// A push arrived (works while the app is closed). Show a notification.
self.addEventListener("push", (event) => {
  let payload = {};
  try {
    payload = event.data ? event.data.json() : {};
  } catch {
    payload = { title: "Stackceipt", body: event.data ? event.data.text() : "" };
  }

  const title = payload.title || "Stackceipt";
  const options = {
    body: payload.body || "",
    icon: payload.icon || "/icon-192.png",
    badge: "/icon-192.png",
    tag: payload.tag || undefined,
    data: { url: payload.url || "/app" },
    // Renotify when a same-tag update matters (e.g. a renewal getting closer).
    renotify: Boolean(payload.tag),
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

// Tapping a notification focuses an open Stackceipt tab (navigating it to the
// target) or opens a new one.
self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const targetUrl = (event.notification.data && event.notification.data.url) || "/app";

  event.waitUntil(
    (async () => {
      const allClients = await self.clients.matchAll({ type: "window", includeUncontrolled: true });
      for (const client of allClients) {
        // Reuse an existing window if we have one.
        if ("focus" in client) {
          await client.focus();
          if ("navigate" in client && client.url !== new URL(targetUrl, self.location.origin).href) {
            try {
              await client.navigate(targetUrl);
            } catch {
              // Cross-origin navigate can throw; ignore and keep focus.
            }
          }
          return;
        }
      }
      if (self.clients.openWindow) {
        await self.clients.openWindow(targetUrl);
      }
    })(),
  );
});
