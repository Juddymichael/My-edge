# Déployer Thunder Edge sur Vercel

Ce projet utilise une fonction serverless `/api/coach` comme relais sécurisé entre le navigateur et Gemini.

La clé `GEMINI_API_KEY` n'est jamais écrite dans le code front-end ni dans GitHub. Elle doit être enregistrée uniquement comme variable d'environnement côté Vercel.

## 1. Créer un compte Vercel

1. Allez sur Vercel.
2. Cliquez sur **Sign Up**.
3. Connectez-vous avec votre compte GitHub.

## 2. Importer le projet GitHub

1. Depuis le tableau de bord Vercel, cliquez sur **Add New Project**.
2. Sélectionnez le dépôt GitHub **Juddymichael/My-edge**.
3. Laissez Vercel détecter automatiquement le projet.
4. Cliquez sur **Deploy** après avoir configuré la variable d'environnement à l'étape suivante.

## 3. Ajouter la clé Gemini dans Vercel

Dans la page de configuration du projet :

1. Ouvrez **Environment Variables**.
2. Ajoutez une variable :
   - **Name :** `GEMINI_API_KEY`
   - **Value :** votre vraie clé API Gemini
3. Activez-la pour les environnements nécessaires, notamment **Production** et **Preview** si vous voulez tester les previews.
4. Enregistrez la variable.

> Ne mettez jamais la vraie clé dans `.env.example`, dans un fichier `src/`, dans le navigateur ou dans un commit GitHub.

## 4. Déployer

Cliquez sur **Deploy**.

Vercel construit l'application et déploie automatiquement la fonction serverless située dans `/api/coach.js`.

Le navigateur appelle uniquement :

`POST /api/coach`

La fonction récupère ensuite `process.env.GEMINI_API_KEY` côté serveur et communique avec Gemini.

## 5. Tester après le déploiement

Ouvrez l'application déployée et utilisez la fonctionnalité Coach déjà présente dans le projet.

Pour vérifier le relais directement, une requête POST vers `/api/coach` doit contenir au minimum :

```json
{
  "message": "Bonjour"
}
```

Le serveur renvoie une réponse JSON contenant `reply` lorsque Gemini répond correctement.

## 6. Tester en local

Copiez `.env.example` vers `.env`, puis remplacez uniquement la valeur locale par votre vraie clé :

```env
GEMINI_API_KEY=votre_vraie_cle
```

Le fichier `.env` est ignoré par Git et ne doit jamais être commité.

Avant de pousser du code, vérifiez toujours :

```bash
git status
```

et assurez-vous que `.env` n'apparaît pas dans les fichiers à committer.

## Sécurité

- `GEMINI_API_KEY` est lue uniquement avec `process.env.GEMINI_API_KEY` côté serveur.
- Le front-end utilise `fetch('/api/coach')` et ne connaît pas la clé.
- `.env` est ignoré par `.gitignore`.
- `.env.example` ne contient aucune vraie clé.
- La fonction applique une limite au message et un timeout de 30 secondes pour l'appel Gemini.
