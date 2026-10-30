# Décisions

Chaque choix pris par défaut, faute d'information, est noté ici avec sa date.
Les valeurs marquées « modifiable » se changent depuis l'espace administrateur, sans toucher au code.

| N° | Date | Sujet | Décision | À confirmer par |
|---|---|---|---|---|
| D-01 | 30/10/2026 | Technologie | Stack imposée par Nextiaa : Next.js + Chakra UI (Vercel), API Fastify (Render), PostgreSQL Neon, e-mails Resend. Hostinger sert uniquement pour le domaine. | — |
| D-02 | 30/10/2026 | Architecture | Le site relaie `/api/*` vers l'API. Les cookies de session sont « first-party » (HttpOnly, SameSite=Lax, Secure en production). Pas de jeton dans le navigateur. | — |
| D-03 | 30/10/2026 | Vercel gratuit | L'offre gratuite « Hobby » de Vercel est réservée à un **usage non commercial**. Pour la production chez le client : passer en Pro (20 $/mois), ou déplacer le site sur Cloudflare Pages (gratuit, usage commercial autorisé). Le code reste le même. | Ronald / M. Michel |
| D-04 | 30/10/2026 | Render gratuit | L'API gratuite s'endort après 15 min sans visite : la première visite suivante attend environ 1 minute. Solution gratuite : un service de surveillance (UptimeRobot, cron-job.org) qui appelle `/sante` toutes les 10 min. On n'utilise pas GitHub Actions pour ça : cela consommerait le quota gratuit du dépôt privé. | Ronald |
| D-05 | 30/10/2026 | Stockage des pièces | Neon gratuit est limité à 0,5 Go : les fichiers n'y seront pas stockés. Le choix du stockage privé gratuit (Cloudflare R2 ou Supabase Storage) sera fait au lot 2. | Ronald |
| D-06 | 30/10/2026 | Administrateurs | Seul l'administrateur principal crée, désactive ou réactive les comptes administrateurs. Il ne peut pas être désactivé. | M. Michel (point 6) |
| D-07 | 30/10/2026 | Connexion | 5 échecs consécutifs bloquent le compte 15 minutes (modifiable dans les variables d'environnement). En plus, 20 tentatives par adresse IP toutes les 5 minutes au maximum. Même message pour « compte inconnu » et « mauvais mot de passe ». | — |
| D-08 | 30/10/2026 | Sessions | Durée : 30 jours pour un candidat (sur son téléphone), 12 heures pour un administrateur ou un recruteur. | — |
| D-09 | 30/10/2026 | Scores minimum (modifiable) | TCF Canada 400, TEF Canada 400, IELTS 6, TOEFL 80. « Autre » : pas de minimum, c'est l'administrateur qui vérifie. | M. Michel (point 1) |
| D-10 | 30/10/2026 | Domaines et compétences (modifiable) | Les 7 domaines de la spécification, avec 5 ou 6 compétences courantes par domaine. | M. Michel (point 4) |
| D-11 | 30/10/2026 | Services (modifiable) | Coaching (comble « coaching »), Formation aux tests de langue (« test de langue »), Séances de mise à niveau (« niveau »), Préparation aux entretiens (ne comble aucun élément). Durées : « À préciser ». | M. Michel |
| D-12 | 30/10/2026 | Paramètres du classement (modifiable) | Niveau provisoire acquis si bureautique « Bon » et au moins 3 ans d'expérience. Services suggérés au grade D : test de langue et coaching. Pièces à vérifier pour confirmer un A : identité, diplôme, attestation de langue. Alerte recruteur : 3 jours avant la fin. Chaque modification crée une nouvelle version. | M. Michel (points 1 et 2) |
| D-13 | 30/10/2026 | Test de langue sans diplôme | La question du test de langue est posée dans une étape « Langues » visible par tous (section M3 de la spécification). | — |
| D-14 | 30/10/2026 | Nom et logo | Nom de travail « Bassin de Talents », logo provisoire « BT ». On les change à un seul endroit : `packages/shared/src/marque.ts` et `apps/web/src/components/marque.tsx`. | M. Michel (point 5) |
| D-15 | 30/10/2026 | Maquettes | Les captures m01 à m16 et w01 à w04 n'ont pas été fournies. Les 4 images d'inspiration de `maquettes/` donnent l'ambiance. Leurs textes ne sont jamais repris. | Ronald |
| D-16 | 30/10/2026 | Journal | Le journal est protégé par la base elle-même : un déclencheur PostgreSQL refuse toute modification, suppression ou vidage. | — |
