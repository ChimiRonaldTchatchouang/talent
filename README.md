# Bassin de Talents

Plateforme du cabinet de M. Michel (placement à l'international, Cameroun). Le candidat dépose son profil une fois
et reçoit un **grade** (A, B, C, D ou « hors bassin »). Il voit ce qui lui manque et les services du cabinet
qui peuvent l'aider. Le cabinet gère le vivier et ouvre un accès anonymisé aux recruteurs.
Réalisation : Nextiaa. La spécification complète est dans [`SPECIFICATION.md`](SPECIFICATION.md).

## Technologie choisie et pourquoi

1. **Une seule base de code TypeScript** (monorepo pnpm) pour les trois espaces : candidat, administrateur, recruteur.
2. **Site : Next.js + Chakra UI**, sur **Vercel**. Pages légères, pensées d'abord pour le téléphone, installables (PWA) au lot 6.
3. **API : Fastify**, sur **Render**. Tous les droits et toutes les règles métier sont vérifiés ici, jamais dans le navigateur.
4. **Base : PostgreSQL sur Neon**, avec Prisma pour les migrations.
5. **E-mails : Resend** (3 000 e-mails par mois gratuits). Sans clé configurée, les e-mails sont écrits dans un journal (mode démo).
6. Le navigateur appelle `/api/...` sur le domaine du site, et Vercel relaie vers Render. Les cookies de session restent sécurisés (HttpOnly, SameSite).
7. Domaine Hostinger (déjà payé) : il pointe vers Vercel, avec HTTPS automatique.
8. **Coût mensuel : 0 FCFA** avec les offres gratuites. Limites à connaître : voir [`DECISIONS.md`](DECISIONS.md) (D-03 et D-04).

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

Dans `apps/api/.env`, renseignez `DATABASE_URL`, `DATABASE_URL_DIRECTE` et le compte administrateur principal. Ensuite :

```bash
cd apps/api && npx prisma migrate deploy && pnpm initialiser
```

```bash
pnpm dev:api
```

```bash
pnpm dev:web
```

- Site : http://localhost:3000 (connexion : `/connexion`, charte : `/charte`)
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
le site (Vercel). Les migrations de base s'appliquent au démarrage de l'API.

## Sauvegarde

La procédure hebdomadaire sera décrite au lot 6. En attendant, Neon garde un historique de restauration
(24 h sur l'offre gratuite).

## Comptes de démonstration

Ils arrivent au lot 6 (données fictives marquées « démo », effaçables d'un clic). Le compte administrateur
principal est créé à partir des variables d'environnement : aucun mot de passe n'est écrit dans le dépôt.
