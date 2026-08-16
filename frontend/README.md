# Soulmeet Mobile

Application Expo SDK 55 / React Native 0.83 de Soulmeet. La référence générale, l’architecture et la configuration complète se trouvent dans le [README racine](../README.md).

## Stack

Expo Router, React 19, TypeScript strict, NativeWind, TanStack React Query, Zustand, Axios, Socket.IO Client, React Hook Form, Zod, Reanimated, SecureStore, Local Authentication et Expo Notifications.

## Routes principales

- `(public)` : accueil, connexion, inscription et récupération de mot de passe.
- `(onboarding)` : profil, apparence/personnalité du coach et préparation.
- `(app)` : Guidance, historique, Insights/Soulprint, Growth, Soul, chat, profil et paramètres.

Les routes protégées dépendent de la session, de la complétion du profil et de l’existence du coach.

## Démarrage

```powershell
corepack pnpm install
Copy-Item .env.example .env
corepack pnpm start
```

Utiliser l’adresse LAN du backend pour un téléphone physique. Expo Go permet le développement général, mais les notifications push distantes et certaines fonctions natives comme Face ID nécessitent un development build.

## Commandes

```powershell
corepack pnpm android
corepack pnpm ios
corepack pnpm web
corepack pnpm lint
corepack pnpm typecheck
corepack pnpm test
corepack pnpm format:check
```

## Organisation

- `src/app` : routes et layouts Expo Router.
- `src/api` : clients REST et intercepteur JWT.
- `src/components/common` : composants visuels réutilisables.
- `src/features` : domaines chat, Guidance, Insights, Growth et Soul.
- `src/services` : stockage sécurisé, biométrie et notifications.
- `src/store` : états Zustand locaux.

Documents complémentaires : [CHAT.md](CHAT.md), [GUIDANCE.md](GUIDANCE.md) et [INSIGHTS.md](INSIGHTS.md).
