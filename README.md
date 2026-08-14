# Soulmeet

Soulmeet est une application mobile de développement personnel et de rencontres centrée sur quatre espaces : **Guidance**, **Insights**, **Growth** et **Soul**. Le dépôt contient une application Expo/React Native et une API NestJS/PostgreSQL.

## État fonctionnel

- Authentification e-mail, Google et Apple, rotation des refresh tokens et restauration de session.
- Récupération et changement de mot de passe, révocation des sessions et verrouillage biométrique local.
- Onboarding du profil et configuration visuelle/personnelle du coach.
- Guidance avec coach IA, streaming SSE, historique, édition logique et mémoires.
- Soulprint structuré, extraction IA asynchrone, confirmations, confidentialité, historique paginé et déduplication.
- Growth : objectifs, exercices, check-ins, journal, parcours, activité, préférences et export/suppression.
- Soul : suggestions de personnes calculées depuis les données compatibles autorisées du Soulprint.
- Chat privé temps réel avec Socket.IO, pagination, statuts envoyé/livré/lu et notifications push de nouveaux messages.
- Thèmes sombre/clair, profil, paramètres, support et préférences de notifications.

Les préférences push Coach, Soulprint et Growth sont persistées et exposées au service serveur. Le déclencheur distant réellement branché actuellement est celui des **nouveaux messages privés** ; les trois autres catégories doivent être appelées par leurs événements métier respectifs.

## Architecture

```text
frontend (Expo Router / React Native)
  ├── REST Axios + JWT
  ├── Socket.IO client
  ├── SSE Guidance
  ├── SecureStore / biométrie / notifications Expo
  └── React Query + Zustand
             │
             ▼
backend (NestJS)
  ├── REST / Swagger / SSE
  ├── Socket.IO gateway
  ├── workers Soulprint persistants
  ├── fournisseurs LLM principal + secours
  ├── Resend et Expo Push Service
  └── Prisma
             │
             ▼
PostgreSQL 16
```

## Stack technique

### Mobile

- Expo SDK 55, React Native 0.83 et React 19.
- Expo Router pour le routage basé sur les fichiers et les groupes public/onboarding/app.
- TypeScript strict, NativeWind/Tailwind CSS et React Native Reanimated.
- TanStack React Query pour l’état serveur ; Zustand pour l’authentification, le chat, l’onboarding et le thème.
- Axios avec ajout du bearer token, refresh automatique et rejeu après `401`.
- React Hook Form, Zod et resolvers pour les formulaires.
- Socket.IO Client pour le chat privé.
- SecureStore pour les tokens et préférences sensibles ; Local Authentication pour Face ID/empreinte.
- Expo Notifications pour les tokens push, les permissions et l’ouverture des conversations.
- Jest Expo et Testing Library.

### API

- NestJS 11, TypeScript et Node.js.
- API REST sous `/api/v1`, Swagger sous `/docs`, Socket.IO et SSE.
- Prisma 6 avec moteur binaire local et PostgreSQL 16.
- JWT access/refresh, Argon2, Google Identity, Apple JWKS, Helmet, CORS et throttling.
- Validation globale avec `class-validator`, transformation et rejet des champs non autorisés.
- LLM local Ollama ou fournisseur OpenAI-compatible : OpenAI, DeepSeek et endpoint compatible personnalisé.
- Fournisseur secondaire, timeouts, retries et file PostgreSQL pour l’extraction Soulprint.
- Resend pour les e-mails de récupération et Expo Push Service pour les notifications distantes.
- Jest pour les tests unitaires et d’intégration de services.

## Arborescence

```text
Soulmeet/
├── frontend/                 application Expo
│   ├── src/app/              routes Expo Router
│   ├── src/api/              clients REST
│   ├── src/components/       composants partagés
│   ├── src/features/         chat, guidance, insights, growth, soul
│   ├── src/services/         tokens, biométrie, notifications
│   └── assets/coaches/       apparences du coach
├── backend/                  API NestJS
│   ├── prisma/               schéma et migrations
│   ├── src/modules/          modules métier
│   └── test/                 tests backend
└── README.md                 référence technique générale
```

## Prérequis

- Node.js 22 LTS recommandé. Node 24 est également supporté par le projet actuel.
- Corepack et pnpm 11.
- Docker avec Docker Compose pour PostgreSQL.
- Android Studio, Xcode ou un appareil physique pour les builds mobiles natifs.
- Ollama local ou une clé de fournisseur LLM compatible.
- Un compte Resend pour la récupération de mot de passe en environnement réel.
- Un projet EAS avec credentials FCM/APNs pour les notifications distantes.

## Installation locale

### 1. Base et backend

```powershell
cd backend
corepack pnpm install
Copy-Item .env.example .env
docker compose up -d
corepack pnpm prisma:generate
corepack pnpm prisma:deploy
corepack pnpm start:dev
```

API : `http://localhost:3000/api/v1`  
Swagger : `http://localhost:3000/docs`  
Santé : `http://localhost:3000/api/v1/health`

### 2. Frontend

```powershell
cd frontend
corepack pnpm install
Copy-Item .env.example .env
corepack pnpm start
```

Sur un téléphone physique, `EXPO_PUBLIC_API_URL` doit utiliser l’adresse LAN du PC, pas `localhost`. Sur l’émulateur Android, utiliser généralement `http://10.0.2.2:3000/api/v1`.

## Variables d’environnement

### Backend

| Variable                                          | Rôle                                                                |
| ------------------------------------------------- | ------------------------------------------------------------------- |
| `DATABASE_URL`                                    | Connexion PostgreSQL.                                               |
| `JWT_ACCESS_SECRET`, `JWT_REFRESH_SECRET`         | Secrets distincts d’au moins 32 caractères.                         |
| `JWT_ACCESS_EXPIRES_IN`, `JWT_REFRESH_EXPIRES_IN` | Durée des tokens.                                                   |
| `CORS_ORIGIN`                                     | Origines autorisées, séparées par des virgules.                     |
| `GOOGLE_CLIENT_IDS`, `APPLE_CLIENT_IDS`           | Audiences OAuth acceptées.                                          |
| `RESEND_API_KEY`, `EMAIL_FROM`                    | Envoi des codes de récupération.                                    |
| `EXPO_ACCESS_TOKEN`                               | Facultatif ; requis si la sécurité renforcée Expo Push est activée. |
| `LLM_PROVIDER`                                    | `ollama`, `openai`, `deepseek` ou `openai-compatible`.              |
| `LLM_BASE_URL`, `LLM_MODEL`, `LLM_API_KEY`        | Fournisseur LLM principal.                                          |
| `OLLAMA_BASE_URL`, `OLLAMA_MODEL`                 | Secours local utilisé automatiquement sans clé distante.             |
| `LLM_DEFAULT_MAX_TOKENS`                          | Plafond de sortie par appel pour maîtriser les coûts.                |
| `LLM_CACHE_*`                                     | Cache LRU local : activation, TTL et nombre maximal d'entrées.       |
| `LLM_FALLBACK_*`                                  | Fournisseur de secours facultatif.                                  |
| `SOULPRINT_*`                                     | Extraction, file, retries, contexte, résumé et historique.          |

Consulter [backend/.env.example](backend/.env.example) pour les valeurs complètes.

### Frontend

| Variable                         | Rôle                                                        |
| -------------------------------- | ----------------------------------------------------------- |
| `EXPO_PUBLIC_API_URL`            | URL complète de l’API, incluant `/api/v1`.                  |
| `EXPO_PUBLIC_GOOGLE_*_CLIENT_ID` | Clients OAuth Google par plateforme.                        |
| `EXPO_PUBLIC_EAS_PROJECT_ID`     | UUID du projet EAS utilisé pour obtenir le token Expo Push. |
| `EXPO_PUBLIC_SUPPORT_EMAIL`      | Adresse des actions Contact/Signalement.                    |
| `EXPO_PUBLIC_HELP_URL`           | Centre d’aide.                                              |
| `EXPO_PUBLIC_TERMS_URL`          | Conditions d’utilisation.                                   |
| `EXPO_PUBLIC_PRIVACY_URL`        | Politique de confidentialité.                               |

Les variables `EXPO_PUBLIC_*` sont intégrées au bundle et ne doivent jamais contenir de secret.

## Données et Prisma

Les migrations sont versionnées dans `backend/prisma/migrations`. Après une modification du schéma :

```powershell
corepack pnpm prisma:migrate --name nom_du_changement
corepack pnpm prisma:generate
```

En déploiement :

```powershell
corepack pnpm prisma:deploy
```

Arrêter le processus Nest avant `prisma:generate` sous Windows si le moteur Prisma est verrouillé. Ne pas utiliser `--no-engine` avec une URL PostgreSQL classique : ce mode attend Prisma Accelerate.

Principaux domaines persistés : utilisateurs, profils, coachs, sessions, conversations, messages, Guidance, mémoires, Soulprint/versioning/extraction, Growth, appareils push, préférences de notifications et codes de récupération.

## IA, Guidance et Soulprint

Le module LLM choisit le fournisseur depuis l’environnement. Le wrapper résilient applique timeout et fournisseur secondaire. Guidance conserve ses conversations séparément du chat privé et propose REST ainsi que SSE.

Après une conversation Guidance, l’extraction Soulprint est placée dans une file PostgreSQL persistante. Le worker reprend les tâches après redémarrage, applique plusieurs tentatives avec délai progressif, valide strictement le JSON du modèle, déduplique les faits et conserve les preuves et versions. Les inférences incertaines restent à confirmer par l’utilisateur.

Documentation détaillée :

- [backend/GUIDANCE.md](backend/GUIDANCE.md)
- [backend/SOULPRINT.md](backend/SOULPRINT.md)
- [frontend/GUIDANCE.md](frontend/GUIDANCE.md)
- [frontend/INSIGHTS.md](frontend/INSIGHTS.md)

## Chat et notifications push

Le chat utilise Socket.IO pour le temps réel et REST pour les listes/historiques paginés. Le serveur enregistre un token Expo par appareil. À la création d’un nouveau message, il vérifie la préférence du destinataire et ses heures silencieuses, puis appelle Expo Push Service avec trois tentatives progressives. Un token signalé `DeviceNotRegistered` est désactivé.

Les notifications distantes exigent un **development build** ; elles ne fonctionnent pas dans Expo Go Android. Il faut configurer le projet EAS, les credentials FCM v1/APNs et `EXPO_PUBLIC_EAS_PROJECT_ID`.

Documentation du chat : [backend/CHAT.md](backend/CHAT.md) et [frontend/CHAT.md](frontend/CHAT.md).

## Sécurité

- Hash Argon2 des mots de passe et refresh tokens.
- Rotation du refresh token et révocation des sessions après changement/récupération du mot de passe.
- Codes de récupération à six chiffres, hachés, expirant après 15 minutes et endpoints limités.
- JWT obligatoire sur les ressources privées et authentification dédiée du socket.
- Validation stricte des DTO, Helmet, CORS explicite et throttling global.
- Tokens mobiles dans SecureStore et verrou biométrique local.
- Visibilité/sensibilité distinctes pour les entrées Soulprint.
- Aucune clé serveur dans le frontend.

## Qualité

```powershell
cd backend
corepack pnpm lint
corepack pnpm build
corepack pnpm test

cd ../frontend
corepack pnpm lint
corepack pnpm typecheck
corepack pnpm test
corepack pnpm format:check
```

État vérifié lors de la dernière mise à jour : 61 tests backend et 33 tests frontend réussis.

## Production

- Utiliser des secrets gérés hors du dépôt et une base PostgreSQL sauvegardée.
- Restreindre `CORS_ORIGIN`, terminer TLS au proxy et activer la sécurité Expo Push si nécessaire.
- Vérifier le domaine d’envoi Resend et ne pas utiliser le domaine de test en production.
- Configurer FCM v1/APNs et générer des builds EAS signés.
- Exécuter `prisma migrate deploy` avant la nouvelle version de l’API.
- Superviser `/api/v1/health`, les erreurs LLM, les tâches Soulprint, les rejets d’e-mails et de push.
- Ajouter une politique de rétention, sauvegarde, suppression de compte et observabilité centralisée avant ouverture publique.

## Documents spécialisés

- [Frontend](frontend/README.md)
- [Backend](backend/README.md)
- [Chat backend](backend/CHAT.md)
- [Guidance backend](backend/GUIDANCE.md)
- [Soulprint backend](backend/SOULPRINT.md)
- [Insights frontend](frontend/INSIGHTS.md)
