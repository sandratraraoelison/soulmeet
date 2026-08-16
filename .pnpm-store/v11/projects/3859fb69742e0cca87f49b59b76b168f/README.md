# Soulmeet Backend

API NestJS 11 de Soulmeet avec PostgreSQL 16, Prisma 6, REST, Swagger, Socket.IO, SSE, fournisseurs LLM, Resend et Expo Push Service. Voir le [README racine](../README.md) pour la référence complète.

## Démarrage

```powershell
corepack pnpm install
Copy-Item .env.example .env
docker compose up -d
corepack pnpm prisma:generate
corepack pnpm prisma:deploy
corepack pnpm start:dev
```

- API : `http://localhost:3000/api/v1`
- Swagger : `http://localhost:3000/docs`
- Healthcheck : `http://localhost:3000/api/v1/health`

## Modules

- `auth` : inscription, connexion, OAuth, sessions, mots de passe et récupération.
- `profiles`, `coaches`, `users` : onboarding, coach, découverte et matching.
- `chat` : conversations privées REST et temps réel Socket.IO.
- `guidance` : coach IA, streaming SSE, historique et mémoires.
- `soulprint` : entrées, confidentialité, extraction persistante, historique et métriques.
- `growth` : objectifs, exercices, check-ins, journal, parcours et préférences.
- `notifications` : appareils, préférences et envoi Expo Push.
- `llm` : fournisseur principal et secours.

## Commandes

### Administration

Apply the administrative migration, then promote an existing account through the controlled CLI:

```bash
pnpm prisma:deploy
pnpm admin:promote admin@example.com SUPER_ADMIN
```

Administrative endpoints live under `/api/v1/admin` and require `SUPER_ADMIN`, `ADMIN`, `MODERATOR`, or `SUPPORT`. Mutations such as moderation, role changes, settings, and internal notes are written to `AuditLog`.

### Sécurité des comptes administrateurs

- **Double authentification (TOTP)** : `POST /auth/2fa/setup` génère un secret, `/auth/2fa/enable` l'active et retourne des codes de récupération hachés à usage unique, `/auth/2fa/disable` la désactive. Ces endpoints exigent un rôle admin.
- **Login en deux étapes** : quand `twoFactorEnabled` est vrai, `POST /auth/login` retourne `{ requiresTwoFactor, twoFactorToken }` (jeton de 5 min) ; `POST /auth/login/2fa` vérifie le TOTP ou un code de récupération avant d'émettre la session.
- **Audit des connexions** : chaque tentative (succès ou échec) sur un compte admin écrit `ADMIN_LOGIN_SUCCESS` / `ADMIN_LOGIN_FAILED` dans `AuditLog` avec l'IP.

### Télémétrie LLM et matchs

- Chaque appel LLM (guidance, check-in quotidien, extraction Soulprint) est enregistré dans `LlmUsage` via un wrapper instrumenté : fournisseur, modèle, latence, tokens estimés, succès/erreur et feature.
- `GET /admin/matches` liste les recommandations persistées par l'application mobile (table `Match`, alimentée par `POST /users/matches`).
- Accès audité au contenu des conversations : `POST /admin/conversations/:id/access` (ou `/guidance-conversations/:id/access`) accorde une fenêtre de 10 minutes après justification ; `GET .../messages` ne renvoie le contenu que pendant cette fenêtre et journalise chaque lecture dans `AuditLog`.
- `GET /admin/analytics` renvoie désormais des séries quotidiennes pour users, reports, soulprints, conversations, guidance et requêtes IA.

```powershell
corepack pnpm lint
corepack pnpm build
corepack pnpm test
corepack pnpm test:cov
corepack pnpm prisma:migrate --name nom
corepack pnpm prisma:deploy
corepack pnpm prisma:studio
```

Sous Windows, arrêter Nest avant de régénérer Prisma si le moteur est verrouillé.

## Documentation métier

- [CHAT.md](CHAT.md)
- [GUIDANCE.md](GUIDANCE.md)
- [SOULPRINT.md](SOULPRINT.md)

Toutes les variables sont décrites dans [`.env.example`](.env.example). Les secrets JWT, LLM, Resend et Expo ne doivent jamais être versionnés.
