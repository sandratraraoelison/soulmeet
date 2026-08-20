# Soulmeet Web

Standalone Next.js client for Soulmeet users. This directory can be moved to its own repository: it never imports from `frontend/`, `dashboard/`, or a root-level local package.

## Local development

```bash
corepack enable
pnpm install
cp .env.example .env.local
pnpm dev
```

Set `API_URL=http://127.0.0.1:3000/api/v1` for a local backend. The web application is configured to run on `http://localhost:3001`, keeping port `3000` available for the backend. Set `NEXT_PUBLIC_APP_URL=http://localhost:3001` accordingly.

## Environment variables

- `API_URL`: server-only backend base URL. It must end with `/api/v1`.
- `NEXT_PUBLIC_APP_URL`: canonical public web origin.
- `NEXT_PUBLIC_GOOGLE_CLIENT_ID`: Google OAuth web client ID.
- `NEXT_PUBLIC_APPLE_CLIENT_ID`: Apple Services ID used by Sign in with Apple for web.

No backend secret or OAuth client secret belongs in a `NEXT_PUBLIC_` variable. Access and refresh tokens are stored only in HttpOnly cookies by the Next.js BFF.

## OAuth callbacks

- Google authorized JavaScript origins: local web origin, preview origin(s), and production origin.
- Apple website/return URL: `${NEXT_PUBLIC_APP_URL}/login`.
- Add the Google web client ID and Apple Services ID to backend `GOOGLE_CLIENT_IDS` and `APPLE_CLIENT_IDS` respectively.

## Backend and CORS

Browser API traffic normally goes through the same-origin Next.js BFF, so direct REST CORS is not required. Add the exact production/preview web origins to backend `CORS_ORIGIN` if enabling direct WebSocket access later. Never use `*` with credentials. Keep the existing mobile and dashboard origins.

## Commands

```bash
pnpm lint
pnpm type-check
pnpm test
pnpm build
pnpm start
```

## Deployment

For Vercel, use `web/` as Root Directory and configure the four variables above per Preview and Production environment. The project can also be placed alone in a new repository without structural changes.

## Browser adaptations and current limits

- Expo SecureStore is replaced by HttpOnly, Secure, SameSite cookies.
- Expo navigation is replaced by the App Router and semantic HTML.
- Coach streaming is passed through by a narrow server route; AI logic stays in the Nest backend.
- Native image/audio pickers are browser file inputs when human chat media is enabled.
- Native Expo push notifications require a separate service worker and Web Push/VAPID integration and are not silently simulated.
- Voice calls in the legacy mobile mock screens have no backend and are not included.
- No active web billing endpoint exists. The web app does not fake a subscription or payment.
- Self-service account deletion needs a backend endpoint; settings directs the user to support instead of pretending deletion succeeded.

## Functional mapping

| Mobile feature                          | Mobile reference                              | Backend API                                                                       | Browser adaptation                                                                                                  | Status               |
| --------------------------------------- | --------------------------------------------- | --------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------- | -------------------- |
| Email and social authentication         | `src/api/auth.api.ts`, auth screens           | `/auth/*`                                                                         | Google Identity Services and Apple JS SDK; tokens remain in HttpOnly cookies behind the BFF                         | Complete             |
| Onboarding                              | `(onboarding)/profile.tsx`, `companion.tsx`   | `/profile`, `/coach`, `/profile/complete-onboarding`                              | Three responsive steps; dating preference and Coach gender are stored separately                                    | Complete             |
| Coach                                   | guidance feature and screens                  | `/guidance/conversations/*`, `/guidance/messages/*`                               | Continuous conversation, SSE, cancellation, retry, deletion and regeneration without moving AI logic into Next.js   | Complete             |
| SoulPrint and Insights                  | insights feature and screens                  | `/soulprint/*`                                                                    | Backend entries, manual entry, privacy controls, confirmation/rejection, deletion, recalculation status and history | Complete             |
| Growth                                  | growth feature                                | `/growth/*`                                                                       | Personal and suggested goals, progress, check-ins, paths, preferences, activity and daily exercise                  | Complete             |
| Soul matching                           | soul feature and profile screens              | `/users/matches/*`                                                                | Responsive recommendations, reciprocal decisions and decision history                                               | Complete             |
| Human messages and discovery            | chat feature, person and conversation screens | `/users/discover`, `/users/:id/public-profile`, `/conversations/*`, `/messages/*` | Discovery, public profiles, private threads, edit/delete, polling and image/audio browser upload                    | Complete             |
| Profile and Coach settings              | profile, coach-profile and companion screens  | `/profile`, `/coach`                                                              | Profile identity, explicit dating/Coach gender split, appearance, traits, instructions and tone levels              | Complete             |
| Security and preferences                | settings screens                              | `/auth/change-password`, `/notifications/preferences`                             | Password, notification, timezone and persistent browser appearance settings                                         | Complete             |
| Native push notifications               | notification service                          | device push-token endpoints                                                       | Requires Web Push, a service worker and VAPID; not simulated                                                        | External integration |
| Store subscription                      | native store integration                      | entitlement data only                                                             | No web checkout contract exists; successful payment is not simulated                                                | External integration |
| Voice calls and legacy match/chat demos | legacy mock screens                           | none                                                                              | Excluded because there is no operational backend contract                                                           | Not applicable       |
| Account deletion                        | settings screen                               | none                                                                              | Support contact is shown until a self-service endpoint exists                                                       | Backend dependency   |

## Verification

Run the following from this directory after every production change:

```bash
corepack pnpm install --frozen-lockfile
corepack pnpm lint
corepack pnpm type-check
corepack pnpm test
corepack pnpm build
```

The essential automated suite currently covers the autonomous same-origin API client, safe backend errors, and legacy gender-value normalization. Coach streaming and the remaining end-to-end journey should use a controlled backend in CI so tests never invoke a paid LLM.
