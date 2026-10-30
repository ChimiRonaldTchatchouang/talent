// Lancé à chaque démarrage en production, après les migrations. Sans effet si tout existe déjà.
import { chargerDonneesDepart, creerAdminPrincipal } from "../lib/initialisation.js";
import { creerPrisma } from "../lib/prisma.js";

const prisma = creerPrisma();
try {
  const faits = await chargerDonneesDepart(prisma);
  console.log(faits.length ? `Listes de référence chargées : ${faits.join(", ")}.` : "Listes de référence déjà présentes.");
  const resultat = await creerAdminPrincipal(prisma, {
    email: process.env.ADMIN_PRINCIPAL_EMAIL,
    motDePasse: process.env.ADMIN_PRINCIPAL_MOT_DE_PASSE,
    nom: process.env.ADMIN_PRINCIPAL_NOM,
  });
  const messages = {
    existe: "Administrateur principal déjà présent.",
    cree: "Administrateur principal créé.",
    manquant:
      "Aucun administrateur principal : renseignez ADMIN_PRINCIPAL_EMAIL et ADMIN_PRINCIPAL_MOT_DE_PASSE puis relancez.",
  };
  console.log(messages[resultat]);
} finally {
  await prisma.$disconnect();
}
