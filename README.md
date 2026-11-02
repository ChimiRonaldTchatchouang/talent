# Bassin de Talents

Plateforme du cabinet de M. Michel (placement à l'international, Cameroun). Le candidat dépose son profil une fois
et reçoit un **grade** (A, B, C, D ou « hors bassin »). Il voit ce qui lui manque et les services du cabinet
qui peuvent l'aider. Le cabinet gère le vivier et ouvre un accès anonymisé aux recruteurs.
Réalisation : Nextiaa. La spécification complète est dans [`SPECIFICATION.md`](SPECIFICATION.md).

## Technologie choisie et pourquoi

1. **Une seule base de code TypeScript** (monorepo pnpm) pour les trois espaces : candidat, administrateur, recruteur.
2. **Site : Next.js + Chakra UI**, sur **Vercel**. Pages légères, pensées d'abord pour le téléphone, installables sur l'écran d'accueil (PWA).
3. **API : Fastify**, sur **Render**. Tous les droits et toutes les règles métier sont vérifiés ici, jamais dans le navigateur.
4. **Base : PostgreSQL sur Neon**, avec Prisma pour les migrations.
5. **E-mails : Resend** (3 000 e-mails par mois gratuits). Sans clé configurée, les e-mails sont écrits dans un journal (mode démo).
6. Le navigateur appelle `/api/...` sur le domaine du site, et Vercel relaie vers Render. Les cookies de session restent sécurisés (HttpOnly, SameSite).
7. Domaine Hostinger (déjà payé) : il pointe vers Vercel, avec HTTPS automatique.
8. Pièces justificatives : stockées dans la base, privées, ouvertes par lien temporaire (voir D-18).
9. **Coût mensuel : 0 FCFA** avec les offres gratuites. Limites à connaître : voir [`DECISIONS.md`](DECISIONS.md) (D-03 et D-04).

## Structure

```
apps/api        API Fastify + Prisma (règles métier, droits, journal)
apps/web        Site Next.js + Chakra UI (affichage uniquement)
packages/shared Schémas de validation, constantes et libellés partagés
maquettes/      Images d'inspiration visuelle
docs/           Déploiement, guide administrateur
```

## Installation locale

Prérequis : Node 22, pnpm 10, PostgreSQL 16.

```bash
pnpm install
```

```bash
cp .env.example apps/api/.env
```

Dans `apps/api/.env`, renseignez `DATABASE_URL` et le compte administrateur principal. Ensuite :

```bash
cd apps/api && pnpm migrer && pnpm initialiser
```

```bash
pnpm dev:api
```

```bash
pnpm dev:web
```

- Site : http://localhost:3000 (inscription : `/inscription`, connexion : `/connexion`, charte : `/charte`)
- Documentation de l'API (OpenAPI) : http://localhost:4000/documentation

## Vérifications

```bash
TEST_DATABASE_URL_ADMIN=postgresql://postgres:postgres@localhost:5432/postgres pnpm test
```

```bash
pnpm lint && pnpm typecheck && pnpm build
```

Les tests de l'API recréent la base `bdt_tests` à chaque passage, sur le PostgreSQL local. Jamais sur Neon.

## Déploiement

Voir [`docs/DEPLOIEMENT.md`](docs/DEPLOIEMENT.md). Résumé : chaque fusion dans `main` redéploie l'API (Render) et
le site (Vercel). Les migrations de base s'appliquent au démarrage de l'API. Neon est joint par WebSocket (port 443).

## Sauvegarde

Chaque dimanche, GitHub Actions copie la base Neon, la chiffre et la garde 90 jours
(`.github/workflows/sauvegarde.yml`). Mise en place et restauration : [`docs/DEPLOIEMENT.md`](docs/DEPLOIEMENT.md),
section 7. Neon garde en plus un historique de restauration de 24 heures.

## Comptes de démonstration

Admin → **Réglages et e-mails** → **Créer les données de démonstration** : environ 20 candidats fictifs marqués
« DÉMO », un compte candidat et un compte recruteur de test. Leurs mots de passe sont générés au hasard et affichés
une seule fois : aucun mot de passe n'est écrit dans le dépôt. Un clic les efface tous.

Le compte administrateur principal est créé à partir des variables d'environnement (`ADMIN_PRINCIPAL_*`).

## Documentation

- [`SPECIFICATION.md`](SPECIFICATION.md) : la spécification du client
- [`docs/manuel-utilisation.md`](docs/manuel-utilisation.md) : manuel d'utilisation, profil par profil (candidat, administrateur, recruteur)
- [`docs/guide-admin.md`](docs/guide-admin.md) : guide détaillé de l'espace administrateur
- [`docs/DEPLOIEMENT.md`](docs/DEPLOIEMENT.md) : déploiement, e-mails, sauvegarde, liste de contrôle de mise en production
- [`DECISIONS.md`](DECISIONS.md) : choix faits par défaut, à confirmer par le client
- [`CHANGELOG.md`](CHANGELOG.md) : ce qui a été livré à chaque lot
- Documentation de l'API (OpenAPI) : `/documentation` sur l'adresse de l'API
