import { PARAMETRES_CLASSEMENT_PAR_DEFAUT } from "@bdt/shared";
import type { PrismaClient } from "@prisma/client";
import { afterAll, beforeEach, describe, expect, it } from "vitest";
import type { App } from "../src/app.js";
import { creerAdminPrincipal } from "../src/lib/initialisation.js";
import { connecter, creerCompte, demarrer, viderBase } from "./outils.js";

let app: App;
let prisma: PrismaClient;
let cookie: string;

beforeEach(async () => {
  if (!app) ({ app, prisma } = await demarrer());
  await viderBase(prisma);
  const admin = await creerCompte(prisma, "ADMIN");
  cookie = await connecter(app, admin.email!);
});
afterAll(async () => {
  await app?.close();
  await prisma?.$disconnect();
});

describe("Listes de référence", () => {
  it("fournit les données de départ à tous, sans connexion", async () => {
    const rep = await app.inject({ method: "GET", url: "/referentiels" });
    expect(rep.statusCode).toBe(200);
    const l = rep.json();
    expect(l.domaines.map((d: { nom: string }) => d.nom)).toContain("BTP");
    expect(l.diplomes[0].nom).toBe("CAP/Certificat professionnel");
    expect(l.testsLangue.find((t: { nom: string }) => t.nom === "IELTS").scoreMinimum).toBe(6);
    expect(l.services).toHaveLength(4);
  });

  it("ajoute, renomme et désactive un domaine ; un domaine désactivé n'est plus proposé", async () => {
    const ajout = await app.inject({ method: "POST", url: "/admin/referentiels/domaines", payload: { nom: "Agriculture" }, headers: { cookie } });
    expect(ajout.statusCode).toBe(201);
    const id = ajout.json().element.id;

    const renomme = await app.inject({
      method: "PATCH",
      url: `/admin/referentiels/domaines/${id}`,
      payload: { nom: "Agriculture et élevage" },
      headers: { cookie },
    });
    expect(renomme.json().element.nom).toBe("Agriculture et élevage");

    await app.inject({ method: "PATCH", url: `/admin/referentiels/domaines/${id}`, payload: { actif: false }, headers: { cookie } });
    const publics = (await app.inject({ method: "GET", url: "/referentiels" })).json();
    expect(publics.domaines.some((d: { id: string }) => d.id === id)).toBe(false);

    const admin = (await app.inject({ method: "GET", url: "/admin/referentiels/domaines", headers: { cookie } })).json();
    expect(admin.elements.find((d: { id: string }) => d.id === id).actif).toBe(false);
    expect(await prisma.journal.count({ where: { cibleId: id } })).toBe(3);
  });

  it("refuse un doublon avec un message clair", async () => {
    const rep = await app.inject({ method: "POST", url: "/admin/referentiels/domaines", payload: { nom: "BTP" }, headers: { cookie } });
    expect(rep.statusCode).toBe(409);
    expect(rep.json().erreur.message).toContain("déjà ce nom");
  });

  it("une compétence proposée n'est proposée à personne tant qu'elle n'est pas validée", async () => {
    const btp = await prisma.domaine.findUniqueOrThrow({ where: { nom: "BTP" } });
    const proposee = await prisma.competence.create({ data: { nom: "Échafaudage", domaineId: btp.id, statut: "PROPOSEE" } });
    const avant = (await app.inject({ method: "GET", url: "/referentiels" })).json();
    expect(avant.competences.some((c: { id: string }) => c.id === proposee.id)).toBe(false);

    const file = (
      await app.inject({ method: "GET", url: "/admin/referentiels/competences?statut=PROPOSEE", headers: { cookie } })
    ).json();
    expect(file.elements).toHaveLength(1);

    const decision = await app.inject({
      method: "POST",
      url: `/admin/referentiels/competences/${proposee.id}/decision`,
      payload: { decision: "VALIDEE" },
      headers: { cookie },
    });
    expect(decision.statusCode).toBe(200);
    const apres = (await app.inject({ method: "GET", url: "/referentiels" })).json();
    expect(apres.competences.some((c: { id: string }) => c.id === proposee.id)).toBe(true);

    const encore = await app.inject({
      method: "POST",
      url: `/admin/referentiels/competences/${proposee.id}/decision`,
      payload: { decision: "REJETEE" },
      headers: { cookie },
    });
    expect(encore.statusCode).toBe(409);
  });

  it("accepte un test de langue sans score minimum (« Autre »)", async () => {
    const rep = await app.inject({
      method: "POST",
      url: "/admin/referentiels/tests-langue",
      payload: { nom: "DELF B2", scoreMinimum: null },
      headers: { cookie },
    });
    expect(rep.statusCode).toBe(201);
    expect(rep.json().element.scoreMinimum).toBeNull();
  });
});

describe("Paramètres du classement", () => {
  it("renvoie les valeurs par défaut, puis garde chaque version", async () => {
    const initial = (await app.inject({ method: "GET", url: "/admin/parametres-classement", headers: { cookie } })).json();
    expect(initial.version).toBeNull();
    expect(initial.valeurs).toEqual(PARAMETRES_CLASSEMENT_PAR_DEFAUT);

    const nouvelles = { ...PARAMETRES_CLASSEMENT_PAR_DEFAUT, experienceMinimumAnnees: 6 };
    const maj = await app.inject({ method: "PUT", url: "/admin/parametres-classement", payload: nouvelles, headers: { cookie } });
    expect(maj.statusCode).toBe(200);
    const apres = (await app.inject({ method: "GET", url: "/admin/parametres-classement", headers: { cookie } })).json();
    expect(apres.valeurs.experienceMinimumAnnees).toBe(6);
    expect(await prisma.parametresClassement.count()).toBe(1);
    expect(await prisma.journal.count({ where: { action: "PARAMETRES_CLASSEMENT_MODIFIES" } })).toBeGreaterThan(0);
  });

  it("refuse des valeurs invalides", async () => {
    const rep = await app.inject({
      method: "PUT",
      url: "/admin/parametres-classement",
      payload: { ...PARAMETRES_CLASSEMENT_PAR_DEFAUT, bureautiqueMinimum: "EXPERT" },
      headers: { cookie },
    });
    expect(rep.statusCode).toBe(400);
  });
});

describe("Administrateur principal", () => {
  it("est créé une seule fois à partir des variables d'environnement", async () => {
    await prisma.utilisateur.deleteMany();
    expect(await creerAdminPrincipal(prisma, {})).toBe("manquant");
    const compte = { email: "Michel@Cabinet.cm", motDePasse: "mot-de-passe-tres-long" };
    expect(await creerAdminPrincipal(prisma, compte)).toBe("cree");
    expect(await creerAdminPrincipal(prisma, compte)).toBe("existe");
    const cookiePrincipal = await connecter(app, "michel@cabinet.cm", "mot-de-passe-tres-long");
    const moi = (await app.inject({ method: "GET", url: "/auth/moi", headers: { cookie: cookiePrincipal } })).json();
    expect(moi.utilisateur.estPrincipal).toBe(true);
  });

  it("refuse un mot de passe principal trop court", async () => {
    await prisma.utilisateur.deleteMany();
    await expect(creerAdminPrincipal(prisma, { email: "a@b.cm", motDePasse: "court" })).rejects.toThrow();
  });
});

describe("Tri", () => {
  it("trie les domaines dans l'ordre alphabétique français", async () => {
    const noms = (await app.inject({ method: "GET", url: "/referentiels" })).json().domaines.map((d: { nom: string }) => d.nom);
    expect(noms.indexOf("Électricité")).toBeLessThan(noms.indexOf("Hôtellerie"));
  });
});
