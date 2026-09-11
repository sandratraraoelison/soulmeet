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

Backend defaults to `http://localhost:3000`; dashboard defaults to `http://localhost:3002`.

## Environment

`API_URL` is server-only and should include `/api/v1`. `NEXT_PUBLIC_USE_MOCK_API` defaults to `false`; no current screen silently uses mock data.

`NEXT_PUBLIC_GOOGLE_CLIENT_ID` enables Google sign-in on the login page. Use a Google OAuth web client whose authorized JavaScript origins include the dashboard URL (for local development, `http://localhost:3002`). The same client ID must be accepted by the backend through `GOOGLE_CLIENT_IDS`.

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
- Advanced moderation warnings and custom date-range analytics still require dedicated backend workflows.
- `LlmUsage` token counts are estimated from characters because some providers do not expose usage; cost figures require per-model pricing configuration.

## Operational metrics and moderation

- Overview prioritizes four indicators, refreshes every minute, and links to urgent, unassigned, and older-than-48-hours pending cases. Pending means OPEN or IN_REVIEW.
- Report lists support priority/age sorting and moderator removal. `/reports/:id` shows the description, profiles, resolution, and the latest 100 audit changes. Historical audit entries may not include assignment or resolution details.
- Analytics uses UTC calendar days, including the partial current day. Comparisons use an equally long elapsed window shifted by the selected number of days.
- `/admin/insights?days=90&country=...` computes registration cohorts for USER accounts. The geographic selector applies only to the activation/retention section. The funnel requires cumulative milestones (completed profile, undeleted Soulprint, member message), not a strict chronological event sequence. Profile completion and country are current values, not historical snapshots; removed records are excluded.
- Day 7/30 retention requires a non-deleted outgoing member or coach message during the 24-hour window starting 7/30 days after registration. Only cohorts with the whole window observed enter the denominator. A 90-day period is needed to observe Day 30. Login-only activity is not counted.
- Reply rate counts conversations created in the period with messages from at least two distinct senders, divided by conversations with at least one message. Geographic filtering matches any participant. Geography shows the top 15 countries among new profiles; members without a profile are excluded from that breakdown.
- AI usage supports 1/7/30/90-day periods, zero-filled daily cost/request/error series, and error codes. Unpriced calls are identified and excluded from costs. The monthly budget is stored as `ai.monthlyBudget` with `{ "amount": 100 }`, in USD, through the audited settings endpoint. ADMIN/SUPER_ADMIN can edit it. The 80%/100% indicators are informational and never stop requests.

Deploy the backend and dashboard changes together. These features use existing tables and require no schema migration. Validate the aggregate SQL against a staging PostgreSQL database before production rollout.

## Quality commands

```bash
pnpm lint
pnpm typecheck
pnpm test
pnpm build
```
