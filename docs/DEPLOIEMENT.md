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

Sans configuration, la plateforme fonctionne en **mode démo** : les e-mails ne partent pas, ils sont listés dans
Admin → Réglages (liens de confirmation compris).

1. Créer un compte sur resend.com.
2. *Domains* → ajouter le domaine du client, puis copier les enregistrements DNS (SPF, DKIM) dans Hostinger → DNS.
   Attendre que Resend affiche « Verified ».
3. *API Keys* → créer une clé « Sending access ».
4. Sur Render → *Environment* :
   - `RESEND_API_KEY` = la clé (à saisir directement dans Render, jamais dans un message ni dans le dépôt)
   - `EMAIL_EXPEDITEUR` = `Bassin de Talents <contact@domaine-du-client.cm>` (adresse du domaine vérifié)
5. Sans domaine vérifié, Resend n'envoie qu'à l'adresse du titulaire du compte : utile pour tester seulement.

## 6. Dépôt des fichiers

Le téléphone envoie les pièces directement à l'API Render (adresse fournie automatiquement par Render). Il faut
seulement que `URL_SITE`, sur Render, soit exactement l'adresse du site : elle autorise ces envois (CORS).
