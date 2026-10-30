import { LIBELLES_ETATS_ETAPE } from "@bdt/shared";
import { Badge } from "@chakra-ui/react";
import type { EtatEtape } from "@/lib/types";

const STYLES: Record<EtatEtape, { bg: string; color: string }> = {
  A_FAIRE: { bg: "brume", color: "gris" },
  EN_COURS: { bg: "#FEF3C7", color: "#92400E" },
  TERMINE: { bg: "menthe", color: "nuit" },
  SAUTE: { bg: "white", color: "gris" },
};

export function BadgeEtatEtape({ etat }: { etat: EtatEtape }) {
  return (
    <Badge bg={STYLES[etat].bg} color={STYLES[etat].color} borderRadius="full" px="3" py="1" fontWeight="600" borderWidth={etat === "SAUTE" ? "1px" : 0}>
      {LIBELLES_ETATS_ETAPE[etat]}
    </Badge>
  );
}
