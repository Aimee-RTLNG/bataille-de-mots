# Bataille de mots (Wordle Wars en français)

[![Netlify Status](https://api.netlify.com/api/v1/badges/049849ed-d2cf-470a-89eb-0c16da01efc2/deploy-status)](https://app.netlify.com/sites/bataille-de-mots/deploys)

Basé sur https://github.com/CTNicholas/wordle-wars, lui-même forké sur https://github.com/yyx990803/vue-wordle

## Stack
- [Vue](https://vuejs.org/)
- [Vite](https://vitejs.dev/)
- [Liveblocks](https://liveblocks.io) (WebSocket)
- [Netlify](https://www.netlify.com/) (déploiement)

## Comment lancer le projet en local ? 

- Installez les dépendances grâce à la commande `npm install`

- Créez un compte sur [liveblocks.io](https://liveblocks.io/dashboard)

- Copiez votre clef publique depuis le menu [administration](https://liveblocks.io/dashboard/apikeys) de Liveblocks

- Créez un fichier `.env.local` à la racine du projet et ajoutez la variable d'environnement suivante : `VITE_LIVEBLOCKS_PUBLIC_KEY=sk_test_yourkey`

- Lancer "npm run dev"