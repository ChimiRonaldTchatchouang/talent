"use client";

import { Box, type BoxProps } from "@chakra-ui/react";
import { useEffect, useRef } from "react";

const mouvementReduit = () => typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

/**
 * Apparition en fondu quand l'élément entre à l'écran, disparition quand il en sort.
 * `sens` : bas (par défaut), gauche, droite ou zoom ; `delai` en millisecondes pour décaler des éléments voisins.
 */
export function Apparition({ sens = "bas", delai = 0, unique = false, ...props }: { sens?: "bas" | "gauche" | "droite" | "zoom"; delai?: number; unique?: boolean } & BoxProps) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (mouvementReduit() || !("IntersectionObserver" in window)) {
      el.dataset.visible = "true";
      return;
    }
    const observateur = new IntersectionObserver(
      ([entree]) => {
        if (!entree) return;
        if (entree.isIntersecting) {
          el.dataset.visible = "true";
          if (unique) observateur.disconnect();
        } else if (!unique) {
          el.dataset.visible = "false";
        }
      },
      { threshold: 0.12, rootMargin: "0px 0px -6% 0px" },
    );
    observateur.observe(el);
    return () => observateur.disconnect();
  }, [unique]);
  return <Box ref={ref} className="bdt-apparition" data-sens={sens} style={{ ["--bdt-delai" as string]: `${delai}ms` }} {...props} />;
}

/**
 * Parallaxe : l'élément se déplace un peu plus lentement (ou plus vite) que la page au défilement.
 * `vitesse` : 0.1 = léger. Désactivée si le téléphone demande moins de mouvement.
 */
export function Parallaxe({ vitesse = 0.12, ...props }: { vitesse?: number } & BoxProps) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el || mouvementReduit()) return;
    let image = 0;
    const calculer = () => {
      image = 0;
      const r = el.getBoundingClientRect();
      // Décalage proportionnel à la distance entre le centre de l'élément et le centre de l'écran.
      const ecart = r.top + r.height / 2 - window.innerHeight / 2;
      el.style.setProperty("--bdt-decalage", `${(-ecart * vitesse).toFixed(1)}px`);
    };
    const auDefilement = () => {
      if (!image) image = requestAnimationFrame(calculer);
    };
    calculer();
    window.addEventListener("scroll", auDefilement, { passive: true });
    window.addEventListener("resize", auDefilement);
    return () => {
      window.removeEventListener("scroll", auDefilement);
      window.removeEventListener("resize", auDefilement);
      cancelAnimationFrame(image);
    };
  }, [vitesse]);
  return <Box ref={ref} className="bdt-parallaxe" {...props} />;
}
