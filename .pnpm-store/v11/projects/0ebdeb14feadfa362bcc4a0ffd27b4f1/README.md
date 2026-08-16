# Soulmeet Admin Dashboard

Secure Next.js administration interface for Soulmeet. The UI is in English and uses the existing NestJS API through a server-side proxy; access and refresh tokens are stored in HttpOnly cookies.

## Requirements

- Node.js 22+
- pnpm 11
- Soulmeet backend and PostgreSQL running

## Setup

```bash
cd backend
pnpm install
pnpm prisma:generate
pnpm prisma:deploy
pnpm start:dev

cd ../dashboard
cp .env.example .env.local
pnpm install
pnpm dev
```

Backend defaults to `http://localhost:3000`; dashboard defaults to `http://localhost:3001`.

## Environment

`API_URL` is server-only and should include `/api/v1`. `NEXT_PUBLIC_USE_MOCK_API` defaults to `false`; no current screen silently uses mock data.

## Roles

`SUPER_ADMIN`, `ADMIN`, `MODERATOR`, and `SUPPORT` can enter the dashboard. Role changes are limited to `SUPER_ADMIN`; moderation excludes `SUPPORT`; settings require `ADMIN` or `SUPER_ADMIN`.

Create the first administrator through a controlled database operation, then sign in with the normal `/auth/login` flow. No development password is embedded in this project.

## API routes consumed

The dashboard consumes `/auth/login`, `/auth/logout`, `/auth/me`, the 2FA endpoints (`/auth/2fa/setup`, `/auth/2fa/enable`, `/auth/2fa/disable`), and the `/admin/*` endpoints for overview, users, coaches, Soulprints, conversations, reports, matches, AI usage, analytics, settings, capabilities, moderators, and audit logs.

Resource collections use server pagination. The user detail view consumes `/admin/users/:id` and `/admin/users/:id/notes`; its Soulprint section receives only `MATCHING_ALLOWED` entries with non-high sensitivity.

## Security

- **Brute-force protection**: the login route rate-limits by IP + email (5 failures per 15 minutes, then a lockout) and returns a generic message.
- **Two-factor authentication**: administrator accounts can enable TOTP. The login flow returns `requiresTwoFactor`, then completes via `/auth/login/2fa` with a short-lived server token; recovery codes are hashed at rest and single-use. Setup lives in Settings → Two-factor authentication.
- **Silent session restore**: the login page attempts `/api/auth/silent-refresh` with the refresh cookie, so an idle dashboard does not force a password re-entry every 15 minutes.
- **Security headers**: `X-Frame-Options: DENY`, `X-Content-Type-Options`, `Referrer-Policy`, `Permissions-Policy`, and a CSP are applied to every response.
- **Proxy hardening**: the `/api/backend` proxy applies a 15-second timeout, propagates `x-request-id`, and refreshes cookies on 401.

## Conversation access

The member and AI-coach conversation views are metadata-only by default. An administrator requests a 10-minute audited access window (`POST /admin/conversations/:id/access` or the guidance equivalent) with a mandatory justification; the grant and every content view are written to `AuditLog`. Message content is only returned while the window is valid.

## Persisted matches

The mobile `/users/matches` endpoint now persists its recommendations into the `Match` table, and the Matches page lists them with score, reciprocal score, and shared grounds.

## Limitations

- Notifications are a visual shell affordance only; backend notification aggregation endpoints do not exist yet.
- Advanced moderation warnings, account deletion, and custom date-range analytics still require dedicated backend workflows.
- `LlmUsage` token counts are estimated from characters because some providers do not expose usage; cost figures require per-model pricing configuration.

## Quality commands

```bash
pnpm lint
pnpm typecheck
pnpm test
pnpm build
```
