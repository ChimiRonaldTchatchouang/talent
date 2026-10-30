# Déploiement

Trois services gratuits, tous reliés au dépôt GitHub. Chaque fusion dans `main` redéploie automatiquement.

## 1. Base de données : Neon

1. Créer un projet Neon. Région retenue : AWS US East 2 (Ohio). Render est placé dans la même région (`render.yaml`).
2. Bouton **Connect** → copier la chaîne **avec pooler** (l'adresse contient `-pooler`) avec le bouton Copier,
   sans la retaper. Retirer `&channel_binding=require` à la fin. C'est la valeur de `DATABASE_URL`.
3. L'API joint Neon par **WebSocket sur le port 443**, et non sur le port PostgreSQL 5432 (bloqué depuis Render,
   erreur `P1001`, voir D-17). Les migrations utilisent le même chemin.
4. Rien d'autre à faire : les tables sont créées au premier démarrage de l'API.

## 2. API : Render

1. Sur Render : *New* → *Blueprint* → choisir le dépôt `talent`. Render lit `render.yaml`.
2. Renseigner les variables demandées :
   - `DATABASE_URL` (Neon, chaîne avec pooler)
   - `URL_SITE` : adresse du site (ex. `https://bassin-de-talents.vercel.app`, puis le domaine du client)
   - `ADMIN_PRINCIPAL_EMAIL`, `ADMIN_PRINCIPAL_MOT_DE_PASSE` (12 caractères minimum), `ADMIN_PRINCIPAL_NOM`
3. À chaque démarrage, l'API applique les migrations, charge les listes de départ si elles sont vides, puis crée
   l'administrateur principal s'il n'existe pas. Ensuite, le mot de passe peut être retiré des variables Render.
4. Vérifier : `https://<service>.onrender.com/sante` répond `{"statut":"ok"}`.
5. Pour éviter la mise en veille (voir D-04) : créer une surveillance gratuite (UptimeRobot ou cron-job.org)
   qui appelle `/sante` toutes les 10 minutes.

## 3. Site : Vercel

1. *Add New Project* → dépôt `talent` → **Root Directory : `apps/web`** (Next.js est détecté).
2. Variable d'environnement : `URL_API` = adresse Render de l'API (ex. `https://bassin-de-talents-api.onrender.com`).
   Elle est lue **au moment du build** : après l'avoir changée, relancer un déploiement.
3. Branche de production : `main`. Les branches de lot obtiennent une adresse de prévisualisation.
   Attention : ces prévisualisations utilisent la même API et la même base que la production.

## 4. Domaine Hostinger

1. Dans Vercel → *Domains* : ajouter le domaine du client (ex. `talents.exemple.cm`).
2. Dans Hostinger → *DNS* : créer l'enregistrement indiqué par Vercel (CNAME `cname.vercel-dns.com`, ou A `76.76.21.21` pour le domaine racine).
3. HTTPS est automatique. Mettre ensuite `URL_SITE` à jour sur Render.

## 5. E-mails : Resend

Tous les e-mails de la plateforme passent par Resend : confirmation de compte, mot de passe oublié, dossier
envoyé, pièce refusée, grade, et notifications aux administrateurs. Sans clé, la plateforme est en **mode démo** :
les e-mails ne partent pas, ils sont listés dans Admin → Réglages.

**Étape 1 — activer l'envoi (5 minutes)**
1. Render → *Environment* → ajouter `RESEND_API_KEY` = la clé Resend (commence par `re_`). La saisir directement
   dans Render, jamais dans un message ni dans le dépôt.
2. *Save Changes* (Render redéploie).
3. Admin → **Réglages et e-mails** → **Envoyer un e-mail de test**. Le statut « Envoyé » ou « Échec » s'affiche,
   avec la raison en cas d'échec.

Tant que `EMAIL_EXPEDITEUR` est vide, l'expéditeur est `onboarding@resend.dev`, et **Resend ne livre qu'à
l'adresse du titulaire du compte Resend**. Pour les candidats, il faut l'étape 2.

**Étape 2 — écrire à tout le monde (domaine du cabinet)**
1. resend.com → *Domains* → *Add domain* → le domaine du client (ex. `cabinet.cm`, ou un sous-domaine `mail.cabinet.cm`).
2. Copier les enregistrements DNS affichés (MX, TXT SPF, TXT DKIM) dans Hostinger → *DNS / Zone DNS*.
3. Attendre que Resend affiche **Verified** (de quelques minutes à quelques heures).
4. Render → `EMAIL_EXPEDITEUR` = `Bassin de Talents <contact@cabinet.cm>` (une adresse de ce domaine) → *Save Changes*.
5. Refaire un e-mail de test.

## 6. Dépôt des fichiers

Le téléphone envoie les pièces directement à l'API Render (adresse fournie automatiquement par Render). Il faut
seulement que `URL_SITE`, sur Render, soit exactement l'adresse du site : elle autorise ces envois (CORS).

## 7. Sauvegarde hebdomadaire (GitHub Actions)

Le fichier `.github/workflows/sauvegarde.yml` copie la base chaque dimanche, la chiffre et la garde 90 jours.

**Mise en place (une fois)**
1. GitHub → dépôt `talent` → *Settings* → *Secrets and variables* → *Actions* → *New repository secret* :
   - `SAUVEGARDE_DATABASE_URL` = la chaîne Neon **sans** `-pooler`, avec `?sslmode=require`
   - `SAUVEGARDE_PHRASE` = une phrase longue (ex. 5 mots au hasard). **Notez-la aussi ailleurs** (gestionnaire de mots de
     passe) : sans elle, la sauvegarde est illisible.
2. Onglet *Actions* → « Sauvegarde hebdomadaire » → *Run workflow* pour tester. Le fichier apparaît en bas de la page
   du lancement, dans *Artifacts*.

**Restaurer une sauvegarde**
1. Télécharger l'artefact (fichier `.zip`), l'extraire : `bassin-de-talents-AAAA-MM-JJ.dump.gpg`.
2. Déchiffrer :

```bash
gpg --decrypt bassin-de-talents-AAAA-MM-JJ.dump.gpg > sauvegarde.dump
```

3. Restaurer dans une base **vide** (créez d'abord une branche ou une base neuve dans Neon) :

```bash
pg_restore --no-owner --no-privileges --dbname "postgresql://…sans-pooler…?sslmode=require" sauvegarde.dump
```

4. Pointer `DATABASE_URL` (Render) vers cette base, puis redémarrer.

Neon permet aussi de revenir en arrière de quelques heures sans sauvegarde : *Branches* → *Restore*.

## 8. Mise en production : liste de contrôle

- [ ] Neon : mot de passe changé depuis sa diffusion dans une conversation ; `DATABASE_URL` à jour sur Render.
- [ ] Render : `URL_SITE` = adresse finale du site (domaine du client), sans `/` final.
- [ ] Render : `RESEND_API_KEY` (clé renouvelée) et `EMAIL_EXPEDITEUR` (adresse du domaine vérifié dans Resend).
- [ ] Vercel : `URL_API` = adresse Render ; domaine du client ajouté ; HTTPS actif.
- [ ] Hostinger : enregistrements DNS de Vercel (site) et de Resend (SPF, DKIM).
- [ ] UptimeRobot (ou équivalent) : `/sante` toutes les 5 à 10 minutes (D-04).
- [ ] Offre Vercel compatible avec un usage commercial (D-03).
- [ ] Sauvegarde : secrets GitHub créés, un lancement manuel réussi.
- [ ] Admin → Réglages : téléphone du cabinet ; e-mail de test reçu.
- [ ] Données de démonstration effacées avant l'ouverture au public.
- [ ] `ADMIN_PRINCIPAL_MOT_DE_PASSE` retiré de Render après la première connexion.

