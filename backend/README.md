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
