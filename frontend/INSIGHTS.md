# Insights and Soulprint

The Insights tab is the mobile view of the authenticated user's Soulprint. It reads and writes only through the NestJS API configured by `EXPO_PUBLIC_API_URL`; no LLM provider, model, or API key belongs in the frontend.

## Screens

- `/insights`: summary, completeness, pending-review count, main categories and actions.
- `/insights/category/[category]`: cursor-paginated entries for a category.
- `/insights/pending`: confirm, edit or dismiss coach suggestions.
- `/insights/entry/new`: manually add a detail and choose its visibility.
- `/insights/entry/[entryId]`: inspect, edit, confirm, change visibility or delete an entry.
- `/insights/privacy`: review the visibility of all entries.
- `/insights/history`: cursor-paginated audit history.

## Data and privacy

TanStack Query owns all server state under the `['soulprint']` key. Mutations invalidate only the affected Soulprint overview, summary, entry, pending and history caches. The existing logout flow calls `queryClient.clear()`, so cached Soulprint data is removed when the session ends. Authentication continues to use the shared Axios client and SecureStore-backed token system.

The completeness percentage describes how much information has been added and confirmed. It is not a personality rating, compatibility score, diagnosis, or measure of personal worth. Visibility controls are sent to the backend for enforcement; the UI does not treat hiding a field as an authorization boundary.

## Testing

Run `corepack pnpm typecheck`, `corepack pnpm lint`, and `corepack pnpm test`. Frontend tests use mocked/plain API-shaped data and never contact an LLM.
