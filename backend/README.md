# Soulmeet Backend

Private chat REST and Socket.IO documentation: [CHAT.md](./CHAT.md).

AI coach Guidance REST/SSE documentation: [GUIDANCE.md](./GUIDANCE.md).

Structured personal context, extraction, privacy, and matching adapter: [SOULPRINT.md](./SOULPRINT.md).

Fondation REST du MVP Soulmeet avec NestJS, PostgreSQL, Prisma et authentification JWT à rotation de refresh token.

## Prérequis

- Node.js LTS (22 recommandé; Node 24 fonctionne également)
- pnpm 11 via Corepack
- Docker avec Docker Compose

## Installation

```bash
corepack enable
pnpm install
cp .env.example .env
```

Dans `.env`, renseigner deux secrets aléatoires distincts d'au moins 32 caractères. Les identifiants PostgreSQL fournis sont uniquement destinés au développement local.

```bash
docker compose up -d
pnpm prisma:generate
pnpm prisma:deploy
pnpm start:dev
```

L'API écoute par défaut sur `http://localhost:3000`; Swagger est disponible sur `http://localhost:3000/docs`.

## Commandes principales

```bash
pnpm lint
pnpm build
pnpm test
pnpm prisma:migrate --name change_name  # créer une migration en développement
pnpm prisma:studio
docker compose down                     # conserve le volume PostgreSQL
```

Pour les tests d'intégration futurs, utiliser une base séparée et définir `DATABASE_URL` dans un fichier d'environnement de test non versionné.

## Endpoints

- `GET /health`
- `POST /auth/register`, `POST /auth/login`, `POST /auth/refresh`, `POST /auth/logout`
- `GET /auth/me` (Bearer JWT)
- `GET /profile`, `PUT /profile`, `POST /profile/complete-onboarding` (Bearer JWT)
- `POST /coach`, `GET /coach`, `PUT /coach` (Bearer JWT)

Les mots de passe et refresh tokens sont hachés avec Argon2. Un refresh révoque l'ancien token et crée une nouvelle session. Le schéma et les interfaces préparent Google et Apple, mais leur échange OAuth reste volontairement marqué TODO et aucun faux endpoint externe n'est exposé.

## Production

Utiliser des secrets forts gérés hors du dépôt, restreindre `CORS_ORIGIN`, appliquer les migrations avec `pnpm prisma:deploy`, terminer TLS au niveau du proxy et superviser les journaux/healthchecks.
