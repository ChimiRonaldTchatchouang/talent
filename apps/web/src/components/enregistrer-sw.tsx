"use client";

import { useEffect } from "react";

/** Enregistre le service worker (production uniquement). */
export function EnregistrerServiceWorker() {
  useEffect(() => {
    if (process.env.NODE_ENV === "production" && "serviceWorker" in navigator) {
      navigator.serviceWorker.register("/sw.js").catch(() => undefined);
    }
  }, []);
  return null;
}
