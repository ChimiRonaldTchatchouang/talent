"use client";

import { useEffect, useState } from "react";

/** Événement d'installation proposé par Chrome (Android, ordinateur). Non standard : typé ici. */
export interface InvitationInstallation extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

declare global {
  interface Window {
    __bdtInvitation?: InvitationInstallation | null;
  }
}

/**
 * Garde l'invitation d'installation dès le chargement du site : le navigateur ne la propose qu'une fois,
 * souvent avant l'ouverture de la page /installer.
 */
export function capterInvitationInstallation() {
  window.addEventListener("beforeinstallprompt", (e) => {
    e.preventDefault();
    window.__bdtInvitation = e as InvitationInstallation;
    window.dispatchEvent(new Event("bdt-invitation"));
  });
  window.addEventListener("appinstalled", () => {
    window.__bdtInvitation = null;
    window.dispatchEvent(new Event("bdt-invitation"));
  });
}

export type Plateforme = "installee" | "invitation" | "iphone" | "android" | "autre";

/** Situation de l'appareil : application déjà installée, invitation disponible, iPhone (Safari), etc. */
export function useInstallation() {
  const [plateforme, setPlateforme] = useState<Plateforme>("autre");
  const [invitation, setInvitation] = useState<InvitationInstallation | null>(null);

  useEffect(() => {
    const maj = () => {
      const ua = navigator.userAgent;
      const installee = window.matchMedia("(display-mode: standalone)").matches || (navigator as { standalone?: boolean }).standalone === true;
      const inv = window.__bdtInvitation ?? null;
      setInvitation(inv);
      setPlateforme(installee ? "installee" : inv ? "invitation" : /iPhone|iPad|iPod/i.test(ua) ? "iphone" : /Android/i.test(ua) ? "android" : "autre");
    };
    maj();
    window.addEventListener("bdt-invitation", maj);
    return () => window.removeEventListener("bdt-invitation", maj);
  }, []);

  async function installer(): Promise<boolean> {
    if (!invitation) return false;
    await invitation.prompt();
    const { outcome } = await invitation.userChoice;
    window.__bdtInvitation = null;
    if (outcome === "accepted") setPlateforme("installee");
    return outcome === "accepted";
  }

  return { plateforme, installer };
}
