"use client";

import type { Role } from "@bdt/shared";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { api } from "./api";
import type { UtilisateurPublic } from "./types";

/**
 * Charge l'utilisateur connecté et redirige vers la connexion sinon.
 * Confort d'affichage uniquement : les droits sont toujours vérifiés par l'API.
 */
export function useSession(roleAttendu: Role) {
  const router = useRouter();
  const [utilisateur, setUtilisateur] = useState<UtilisateurPublic | null>(null);

  useEffect(() => {
    let actif = true;
    api<{ utilisateur: UtilisateurPublic }>("/auth/moi")
      .then(({ utilisateur }) => {
        if (!actif) return;
        if (utilisateur.role !== roleAttendu) router.replace("/connexion");
        else setUtilisateur(utilisateur);
      })
      .catch(() => actif && router.replace("/connexion"));
    return () => {
      actif = false;
    };
  }, [roleAttendu, router]);

  return utilisateur;
}

export const ACCUEIL_PAR_ROLE: Record<Role, string> = {
  ADMIN: "/admin",
  CANDIDAT: "/candidat",
  RECRUTEUR: "/recruteur",
};
