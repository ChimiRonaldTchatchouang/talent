import type { PrismaClient } from "@prisma/client";

/**
 * Efface un compte et tout ce qui s'y rattache (dossier, pièces et leurs fichiers, sessions, sélections,
 * consultations, notes). Les e-mails adressés à la personne sont supprimés ; son nom est retiré des
 * e-mails envoyés au cabinet. Le journal (ajout seulement) ne garde que des identifiants techniques.
 */
export async function effacerCompte(db: PrismaClient, utilisateurId: string): Promise<void> {
  const u = await db.utilisateur.findUnique({
    where: { id: utilisateurId },
    include: { dossier: { include: { pieces: { select: { fichierId: true } } } } },
  });
  if (!u) return;
  const d = u.dossier;
  const fichiers = d?.pieces.map((p) => p.fichierId) ?? [];
  const adresses = [u.email, d?.emailContact].filter((x): x is string => !!x);
  const nom = [d?.prenoms, d?.nom].filter(Boolean).join(" ").trim();

  await db.$transaction(async (tx) => {
    // Le dossier part avec le compte (cascade) ; les fichiers sont supprimés ensuite.
    await tx.utilisateur.delete({ where: { id: u.id } });
    if (fichiers.length) await tx.fichier.deleteMany({ where: { id: { in: fichiers } } });
    if (adresses.length) await tx.emailEnvoye.deleteMany({ where: { destinataire: { in: adresses } } });
    if (nom.length >= 3) {
      await tx.$executeRaw`UPDATE "emails" SET "sujet" = replace("sujet", ${nom}, '[candidat supprimé]'), "texte" = replace("texte", ${nom}, '[candidat supprimé]'), "html" = replace("html", ${nom}, '[candidat supprimé]') WHERE "sujet" LIKE ${"%" + nom + "%"} OR "texte" LIKE ${"%" + nom + "%"} OR "html" LIKE ${"%" + nom + "%"}`;
    }
  });
}
