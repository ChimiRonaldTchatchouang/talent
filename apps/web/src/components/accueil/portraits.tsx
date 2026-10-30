import { Box, type BoxProps } from "@chakra-ui/react";
import Image from "next/image";
import { type EmplacementPhoto, PHOTOS_ACCUEIL } from "./photos";

interface Personne {
  peau: string;
  cheveux: string;
  tenue: string;
  fond: string;
  coiffure: "courte" | "longue" | "tresses" | "rase";
}

/** Personnes variées (couleurs de peau, coiffures) pour les illustrations provisoires. */
const PERSONNES: Personne[] = [
  { peau: "#6B4226", cheveux: "#1B1B1B", tenue: "#006D33", fond: "#7CF5A5", coiffure: "tresses" },
  { peau: "#F2C9A0", cheveux: "#8A5A2B", tenue: "#0F2A4A", fond: "#EEF2FB", coiffure: "longue" },
  { peau: "#4A2E1C", cheveux: "#111111", tenue: "#D97706", fond: "#EEF2FB", coiffure: "rase" },
  { peau: "#E8B98F", cheveux: "#2B2B2B", tenue: "#912CEA", fond: "#7CF5A5", coiffure: "courte" },
];

function Illustration({ p }: { p: Personne }) {
  return (
    <svg viewBox="0 0 200 240" width="100%" height="100%" role="img" aria-hidden preserveAspectRatio="xMidYMax meet">
      <rect width="200" height="240" fill={p.fond} />
      {p.coiffure === "longue" && <path d="M58 92 Q60 40 100 38 Q140 40 142 92 L146 168 L54 168 Z" fill={p.cheveux} />}
      {p.coiffure === "tresses" && (
        <>
          <path d="M60 90 Q62 42 100 40 Q138 42 140 90 L140 100 L60 100 Z" fill={p.cheveux} />
          {[66, 78, 122, 134].map((x) => (
            <rect key={x} x={x - 4} y="92" width="8" height="70" rx="4" fill={p.cheveux} />
          ))}
        </>
      )}
      <path d="M40 240 Q44 168 100 160 Q156 168 160 240 Z" fill={p.tenue} />
      <rect x="88" y="128" width="24" height="34" rx="10" fill={p.peau} />
      <ellipse cx="100" cy="96" rx="36" ry="42" fill={p.peau} />
      {p.coiffure === "courte" && <path d="M64 88 Q64 50 100 50 Q136 50 136 88 Q122 66 100 68 Q78 66 64 88 Z" fill={p.cheveux} />}
      {p.coiffure === "rase" && <path d="M66 82 Q70 54 100 54 Q130 54 134 82 Q118 70 100 70 Q82 70 66 82 Z" fill={p.cheveux} opacity="0.9" />}
      {(p.coiffure === "longue" || p.coiffure === "tresses") && (
        <path d="M64 86 Q68 54 100 54 Q132 54 136 86 Q116 70 100 72 Q84 70 64 86 Z" fill={p.cheveux} />
      )}
      <circle cx="86" cy="98" r="3.5" fill="#1B1B1B" />
      <circle cx="114" cy="98" r="3.5" fill="#1B1B1B" />
      <path d="M88 116 Q100 126 112 116" stroke="#1B1B1B" strokeWidth="3" fill="none" strokeLinecap="round" />
    </svg>
  );
}

const ILLUSTRATION_PAR_EMPLACEMENT: Record<EmplacementPhoto, number> = {
  accueil: 0,
  equipe: 1,
  groupe: 2,
  entretien: 3,
  echange: 1,
  metier: 2,
  formation: 0,
};

/**
 * Photo d'un emplacement de la page d'accueil (voir photos.ts) ; tant qu'elle n'est pas fournie,
 * une illustration provisoire de personnes variées s'affiche.
 */
export function Photo({ emplacement, prioritaire = false, ...props }: { emplacement: EmplacementPhoto; prioritaire?: boolean } & BoxProps) {
  const photo = PHOTOS_ACCUEIL[emplacement];
  const personne = PERSONNES[ILLUSTRATION_PAR_EMPLACEMENT[emplacement] % PERSONNES.length]!;
  return (
    // Le fond reprend la couleur de l'illustration : elle reste entière quel que soit le format de l'emplacement.
    <Box position="relative" overflow="hidden" borderRadius="24px" bg={photo ? "brume" : personne.fond} {...props}>
      {photo ? (
        <Image src={photo.src} alt={photo.alt} fill priority={prioritaire} sizes="(max-width: 768px) 100vw, 50vw" style={{ objectFit: "cover" }} />
      ) : (
        <Illustration p={personne} />
      )}
    </Box>
  );
}
