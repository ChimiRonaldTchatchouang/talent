"use client";

import { useEffect } from "react";
import { capterInvitationInstallation } from "@/lib/installation";

/** Enregistre le service worker (production uniquement) et garde l'invitation d'installation de l'application. */
export function EnregistrerServiceWorker() {
  useEffect(() => {
    capterInvitationInstallation();
    if (process.env.NODE_ENV === "production" && "serviceWorker" in navigator) {
      navigator.serviceWorker.register("/sw.js").catch(() => undefined);
    }
  }, []);
  return null;
}
