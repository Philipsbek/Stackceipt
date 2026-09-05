/**
 * Browser-side Web Push helpers. No third-party SDK — this uses the native
 * ServiceWorker + PushManager + Notification APIs. Pairs with public/sw.js and
 * the server actions in src/lib/actions/push.ts.
 */

export interface SerializedSubscription {
  endpoint: string;
  p256dh: string;
  auth: string;
}

/** Web Push works only in a secure context with SW + Push + Notification APIs. */
export function pushSupported(): boolean {
  return (
    typeof window !== "undefined" &&
    "serviceWorker" in navigator &&
    "PushManager" in window &&
    "Notification" in window
  );
}

/** Current OS/browser permission for notifications. */
export function notificationPermission(): NotificationPermission | "unsupported" {
  if (!pushSupported()) return "unsupported";
  return Notification.permission;
}

/** Standalone (installed to home screen) detection — iOS needs this for push. */
export function isStandalone(): boolean {
  if (typeof window === "undefined") return false;
  const iosStandalone = (window.navigator as unknown as { standalone?: boolean }).standalone;
  return window.matchMedia?.("(display-mode: standalone)").matches || iosStandalone === true;
}

/** Rough iOS detection (Safari is the only PWA engine on iOS). */
export function isIOS(): boolean {
  if (typeof navigator === "undefined") return false;
  return /iP(hone|ad|od)/.test(navigator.userAgent) ||
    // iPadOS 13+ reports as Mac; disambiguate by touch points.
    (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
}

/** Ensure our service worker is registered and ready. */
export async function ensureServiceWorker(): Promise<ServiceWorkerRegistration | null> {
  if (!pushSupported()) return null;
  try {
    const existing = await navigator.serviceWorker.getRegistration("/");
    const reg = existing ?? (await navigator.serviceWorker.register("/sw.js", { scope: "/" }));
    await navigator.serviceWorker.ready;
    return reg;
  } catch {
    return null;
  }
}

/** Is this device already subscribed to push? */
export async function currentSubscription(): Promise<PushSubscription | null> {
  if (!pushSupported()) return null;
  const reg = await ensureServiceWorker();
  if (!reg) return null;
  return reg.pushManager.getSubscription();
}

function urlBase64ToUint8Array(base64String: string): Uint8Array<ArrayBuffer> {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(base64);
  const buffer = new ArrayBuffer(raw.length);
  const output = new Uint8Array(buffer);
  for (let i = 0; i < raw.length; i++) output[i] = raw.charCodeAt(i);
  return output;
}

function bufferToBase64Url(buffer: ArrayBuffer | null): string {
  if (!buffer) return "";
  const bytes = new Uint8Array(buffer);
  let binary = "";
  for (const b of bytes) binary += String.fromCharCode(b);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

/** Serialize a PushSubscription into the fields our server needs. */
export function serializeSubscription(sub: PushSubscription): SerializedSubscription {
  return {
    endpoint: sub.endpoint,
    p256dh: bufferToBase64Url(sub.getKey("p256dh")),
    auth: bufferToBase64Url(sub.getKey("auth")),
  };
}

/**
 * Ask permission (if needed) and subscribe this device to push. Returns the
 * serialized subscription for the server to store, or throws with a reason.
 */
export async function subscribeThisDevice(vapidPublicKey: string): Promise<SerializedSubscription> {
  if (!pushSupported()) throw new Error("This browser does not support notifications.");
  if (!vapidPublicKey) throw new Error("Push is not configured on the server.");

  const permission = await Notification.requestPermission();
  if (permission !== "granted") {
    throw new Error(
      permission === "denied"
        ? "Notifications are blocked. Enable them for this site in your browser settings."
        : "Notification permission was not granted.",
    );
  }

  const reg = await ensureServiceWorker();
  if (!reg) throw new Error("Could not register the service worker.");

  const existing = await reg.pushManager.getSubscription();
  const sub =
    existing ??
    (await reg.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(vapidPublicKey),
    }));

  return serializeSubscription(sub);
}

/** Unsubscribe this device locally. Returns the endpoint that was removed. */
export async function unsubscribeThisDevice(): Promise<string | null> {
  const sub = await currentSubscription();
  if (!sub) return null;
  const endpoint = sub.endpoint;
  try {
    await sub.unsubscribe();
  } catch {
    // Even if the browser call fails, we still tell the server to drop it.
  }
  return endpoint;
}
