import type { MetadataRoute } from "next";

/**
 * PWA web app manifest (served at /manifest.webmanifest). Makes Stackceipt
 * installable to the home screen on Android and iOS with its own icon and a
 * standalone, full-screen launch — no browser chrome.
 */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Stackceipt",
    short_name: "Stackceipt",
    description: "Know what your software stack is costing you.",
    id: "/",
    start_url: "/app",
    scope: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#ffffff",
    theme_color: "#101012",
    categories: ["business", "finance", "productivity"],
    icons: [
      { src: "/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icon-maskable-192.png", sizes: "192x192", type: "image/png", purpose: "maskable" },
      { src: "/icon-maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
