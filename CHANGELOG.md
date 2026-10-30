# Journal des livraisons

## Lot 4 — Espace administrateur (30/10/2026)

**Livré**
- **Tableau de bord** : profils par grade, brouillons, pièces à vérifier, grades provisoires à confirmer, grades à revoir, candidats intéressés par un service, derniers dossiers reçus. Chaque compteur mène à la liste correspondante.
- **Vivier** en colonnes A, B, C, D et hors bassin, ou en liste. Les cartes affichent les initiales, le métier, la ville, l'état du grade, ce qui manque et les pièces à vérifier.
- **Filtres combinables** : grade, état du grade, domaine, compétences (validées), ville, langue, test de langue validé, passeport valide, années d'expérience, état des justificatifs, grade à revoir, recherche par nom ou téléphone. Le bouton « Effacer les filtres » apparaît quand il n'y a aucun résultat.
- **Export Excel (CSV)** de la liste filtrée, sans les pièces, inscrit au journal.
- **Fiche candidat** :
  - onglets Personnel, Académique, Professionnel, Matrimonial, Justificatifs, Services et Historique ;
  - bloc « Pourquoi ce grade » et notes internes ;
  - confirmer, corriger (raison obligatoire) ou libérer le grade, et évaluer le niveau ;
  - faire avancer les services et réinitialiser le mot de passe ;
  - chaque consultation est inscrite au journal.
- **File de vérification** : aperçu du document à côté des informations déclarées. « Vérifiée », ou « Refusée » avec un motif (choix rapide ou texte libre), qui prévient le candidat par e-mail. L'historique des refus est affiché et le grade est recalculé.
- **Suivi des services** : demandes par état, avancement en un clic.

**Tests** : 108 tests d'API, dont la recherche de la section 14 (« tous les A et B en BTP avec passeport valide ») et l'export. Parcours complet vérifié dans un navigateur sur des données de démonstration.


## Lot 3 — Moteur de classement (30/10/2026)

**Livré**
- **Moteur de classement** (`apps/api/src/classement/moteur.ts`) : fonctions pures, sans base de données ni IA, avec tous les seuils lus dans les paramètres. Il évalue les quatre éléments (diplôme, test de langue, coaching, niveau), applique les règles R-01 à R-05, R-12 et R-13, et produit l'explication (fait, en attente de vérification, manquant).
- **Grade en base** : grade calculé et grade affiché, état provisoire, confirmé ou corrigé, historique complet. Recalcul automatique à chaque changement : étape, envoi, pièce, service réalisé, évaluation du niveau, paramètres.
- **Services** : suggestion automatique pour chaque élément manquant, bouton « Je suis intéressé(e) » avec e-mail aux administrateurs. Les états vont de Suggéré à Réalisé ; un service réalisé relance le calcul (R-11).
- **API du cabinet** (écrans au lot 4) : évaluer le niveau, faire avancer un service, confirmer un grade (refusé pour un A sans pièces vérifiées), corriger un grade avec une raison, libérer un grade. Le candidat est prévenu par e-mail.
- **Espace candidat** : carte du grade (lettre et couleur, provisoire ou confirmé), « Ce qui te manque », services suggérés, et écran « Pourquoi ce grade ? ».

**Tests** : 18 tests du moteur (T1 à T8 et règles détaillées) et 12 tests d'intégration (T7, T9, T14, T15, services, correction, historique). 97 tests d'API au total.


## Lot 2 — Espace candidat (30/10/2026)

**Livré**
- **Page d'accueil** pensée pour le téléphone : présentation, quatre étapes, les grades, les services du cabinet, avertissement « ni emploi, ni visa, ni départ ». Illustrations provisoires en attendant les photos (D-22).
- **Inscription** par e-mail (ou téléphone) et mot de passe, avec les deux consentements datés. Confirmation de l'e-mail et mot de passe oublié par lien, ou renvoi vers le cabinet pour un compte sans e-mail.
- **Sommaire du dossier** : progression, état de chaque étape (à faire, en cours, terminé, sauté), « Reprendre où je me suis arrêté », accord recruteurs modifiable.
- **Dossier en 5 étapes**, une question ou un petit groupe par écran. Questions filtres (diplôme, test de langue, expérience) : la section masquée est gardée mais ignorée, et réapparaît si la réponse repasse à Oui. Expériences sur plusieurs lignes, compétences de la liste ou proposées par le candidat.
- **Enregistrement automatique** à chaque écran, et reprise après une nouvelle connexion.
- **Justificatifs** : seules les pièces utiles sont demandées. Photo (appareil du téléphone) ou fichier JPG, PNG, PDF jusqu'à 10 Mo, photos compressées avant l'envoi. États déposée, vérifiée, refusée (avec motif), redépôt possible. Sans réseau, le fichier est envoyé automatiquement au retour du réseau. Fichiers privés, ouverts par lien temporaire.
- **Récapitulatif** avec « Modifier » par section, case « je certifie l'exactitude » et envoi. L'envoi est possible avec des pièces manquantes, qui sont listées.
- **E-mails** (Resend, ou mode démo sans clé) : compte créé, confirmation, mot de passe oublié, dossier envoyé (candidat et administrateurs). Journal des e-mails visible dans Admin → Réglages.
- **Admin → Réglages** : téléphone et e-mail du cabinet.

**Tests** : 67 tests d'API, dont T12 (reprise à la dernière étape) et T13 (même numéro refusé). Parcours complet vérifié dans un navigateur au format téléphone, de l'inscription à la réception par l'administrateur.


## Lot 1 — Fondations (30/10/2026)

**Livré**
- Monorepo pnpm : `apps/api` (Fastify, Prisma, PostgreSQL), `apps/web` (Next.js, Chakra UI), `packages/shared`.
- Comptes et trois rôles (candidat, administrateur, recruteur). Droits vérifiés côté serveur sur chaque route, avant même la lecture des données envoyées.
- Connexion par e-mail ou téléphone (+237 ajouté automatiquement). Mots de passe hachés en Argon2id. Blocage après 5 échecs. Sessions en cookie sécurisé, déconnexion.
- Administrateur principal créé au premier démarrage, à partir des variables d'environnement. Il peut créer, désactiver ou réactiver d'autres administrateurs.
- Listes de référence (M2) avec données de départ : domaines, compétences (avec la file « à valider »), tests de langue avec score minimum, services avec l'élément comblé, diplômes. Ajout, modification, désactivation et réactivation.
- Paramètres du classement, gardés en versions successives.
- Journal des actions, impossible à modifier (protégé par la base). Toutes les actions sensibles y sont inscrites.
- Charte graphique : couleurs, Poppins, cartes, pastilles de grade (lettre et couleur), badges d'état, boutons de 52 px sur mobile. Page de démonstration : `/charte`.
- Écrans administrateur : connexion, tableau de bord (provisoire), listes de référence, paramètres, administrateurs.
- Documentation de l'API (OpenAPI) sur `/documentation`.
- Intégration continue GitHub Actions (typage, lint, tests sur PostgreSQL 16, build). Blueprint Render (`render.yaml`).

- Connexion à Neon par WebSocket (port 443) et outil de migration compatible Prisma (voir D-17).

**Tests** : 36 tests d'API (connexion, droits, journal, listes, paramètres, admin principal, migrations) et 7 tests des outils partagés.

**Reste à faire pour clore le lot** : brancher Vercel, Render et Neon (voir `docs/DEPLOIEMENT.md`).
