/**
 * Holds the browser's deferred "install app" prompt (Android/Chrome fires
 * `beforeinstallprompt` once, early). We capture it globally so any control that
 * mounts later (e.g. inside a dropdown) can still offer installation.
 */

export interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

let deferredPrompt: BeforeInstallPromptEvent | null = null;
const listeners = new Set<() => void>();

export function setDeferredPrompt(e: BeforeInstallPromptEvent | null): void {
  deferredPrompt = e;
  listeners.forEach((cb) => cb());
}

export function getDeferredPrompt(): BeforeInstallPromptEvent | null {
  return deferredPrompt;
}

export function subscribeInstall(cb: () => void): () => void {
  listeners.add(cb);
  return () => listeners.delete(cb);
}
