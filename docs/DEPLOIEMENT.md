# Déploiement

Trois services gratuits, tous reliés au dépôt GitHub. Chaque fusion dans `main` redéploie automatiquement.

## 1. Base de données : Neon

1. Créer un projet Neon. Région retenue : AWS US East 2 (Ohio). Render est placé dans la même région (`render.yaml`).
2. Récupérer deux chaînes de connexion :
   - **avec pooler** (« Pooled connection ») → `DATABASE_URL`
   - **sans pooler** (« Direct connection ») → `DATABASE_URL_DIRECTE` (sert aux migrations)
3. À la fin des deux chaînes, ajouter `&connect_timeout=30` et retirer `&channel_binding=require`.
   Sur l'offre gratuite, Neon met la base en veille. Sans délai suffisant, le réveil provoque l'erreur
   `P1001: Can't reach database server`.
4. Rien d'autre à faire : les tables sont créées au premier démarrage de l'API.

## 2. API : Render

1. Sur Render : *New* → *Blueprint* → choisir le dépôt `talent`. Render lit `render.yaml`.
2. Renseigner les variables demandées :
   - `DATABASE_URL`, `DATABASE_URL_DIRECTE` (Neon)
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

## 5. E-mails : Resend (lot 2)

1. Créer un compte Resend, ajouter le domaine du client et copier les enregistrements DNS dans Hostinger (SPF, DKIM).
2. Renseigner `RESEND_API_KEY` et `EMAIL_EXPEDITEUR` sur Render.
