# CLAUDE.md — Bassin de Talents

Spécification de référence : `SPECIFICATION.md`. La lire entièrement avant toute action.
Décisions prises par défaut : `DECISIONS.md`. Livraisons : `CHANGELOG.md`.

## Méthode
- Lots de la section 10, dans l'ordre. Une branche par lot (`lot-N-nom`), fusionnée dans `main` à la fin du lot.
- À la fin de chaque lot : tests verts, résumé de ce qui est fait et de ce qui reste, mise à jour de `CHANGELOG.md`.
- Information manquante : valeur par défaut, modifiable par l'administrateur, notée dans `DECISIONS.md`. Ne pas bloquer.
- Commits courts, en français (« Ajoute le formulaire académique… »).

## Règles absolues
- Règles métier (section 6) et sécurité (section 8) avant tout le reste.
- Droits vérifiés côté serveur, en `onRequest` (`exigerRole`), jamais seulement dans l'interface.
- Aucune logique métier dans `apps/web` : tout passe par l'API.
- Seuils et règles du classement lus dans les paramètres (`parametres_classement`), jamais écrits en dur.
- Moteur de classement : fonctions pures, testées (T1 à T15).
- Le recruteur ne reçoit jamais : téléphone, e-mail, adresse, date de naissance complète, nom de famille complet, conjoint, enfants, fichiers.
- Aucun secret dans le dépôt. Uniquement `.env.example`.
- Toute action sensible est inscrite au journal (`journaliser`). Le journal n'est jamais modifié.
- Interface en français : candidat tutoyé, administrateur et recruteur vouvoyés. Erreurs de l'API en français, au format `{ erreur: { code, message, details? } }`.
- Ne pas reprendre les textes des maquettes.

## Commandes
- Tout : `pnpm install`, `pnpm typecheck`, `pnpm lint`, `pnpm test`, `pnpm build`
- API : `cd apps/api && pnpm test` (PostgreSQL 16 local ; la base `bdt_tests` est recréée à chaque passage, jamais sur Neon)
  - `TEST_DATABASE_URL_ADMIN=postgresql://postgres:postgres@localhost:5432/postgres`
  - Nouvelle migration (base locale) : `DATABASE_URL=... DATABASE_URL_DIRECTE=... npx prisma migrate dev --name nom`
  - Application des migrations : `pnpm migrer` (outil maison, WebSocket pour Neon, voir D-17). Ne pas utiliser `prisma migrate deploy` sur Neon.
- Après une modification de `packages/shared` : `pnpm --filter @bdt/shared build`.
