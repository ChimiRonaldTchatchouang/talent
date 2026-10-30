# Journal des livraisons

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
