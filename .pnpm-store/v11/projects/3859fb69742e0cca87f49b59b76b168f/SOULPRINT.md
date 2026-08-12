# Soulmeet Soulprint

Soulprint is the authenticated user's structured, evolving personal context. It is not a one-time questionnaire.

- **Profile** contains information entered directly during onboarding.
- **Memory** stores individual facts and events from conversations.
- **Soulprint** combines durable profile facts, declarations, cautious AI inferences, evidence, and explicit user confirmations into a versioned representation.

## Data model

Each user has at most one `Soulprint`. Its entries have a category, source, status, visibility, sensitivity, confidence (0–1), importance and matching weight (0–100). Evidence references Guidance user messages without storing excerpts. Every user mutation and merge creates a `SoulprintEntryChange`; recalculation creates a `SoulprintVersion` snapshot.

Sources are prioritized as follows: `USER_CONFIRMED`, `MANUAL_USER_ENTRY`, `USER_DECLARED`, `USER_PROFILE`, then `AI_INFERRED`. Explicit declarations normally become `ACTIVE`; inferences remain `PENDING_CONFIRMATION`. Confirmation changes the source to `USER_CONFIRMED`, status to `CONFIRMED`, and confidence to 1. Rejected fingerprints are retained to prevent immediate recreation. Deletion is logical.

Visibility is independent of status:

- `PRIVATE`: excluded from Guidance and matching.
- `GUIDANCE_ONLY`: available to the user's coach.
- `MATCHING_ALLOWED`: may enter the limited derived matching profile.

`HIGHLY_SENSITIVE` entries can never be enabled for matching. Matching never receives evidence, conversations, reasoning, history, or another user's complete Soulprint.

## Guidance extraction

After both sides of a Guidance exchange are persisted, a PostgreSQL-backed job is upserted per user. Workers atomically claim due jobs and process several users concurrently, while the unique per-user job and Soulprint lock prevent two extractions for the same person. A revision counter schedules another pass when a message arrives during an active extraction, so work is neither duplicated nor lost. Failures use exponential backoff, and stale or unprocessed work is recovered after a restart. The Guidance response is never delayed by extraction. The task analyzes only new messages after `lastAnalyzedMessageId`, with a bounded amount of context.

The shared `LlmProvider` selects Ollama, DeepSeek, OpenAI, or another OpenAI-compatible provider by environment. The extraction prompt treats messages as untrusted data, accepts evidence from user-message IDs only, and forbids sensitive inference. Output is strictly validated JSON; one safe substring parse is allowed, without `eval`. Failed extraction releases its lock and does not advance the cursor.

Merging uses a normalized category/key/value fingerprint. Equivalent entries gain evidence rather than duplicates. Higher-priority, newer declarations can update lower-priority information. AI inference cannot replace confirmed information. Explicit contradictions supersede only unconfirmed entries and create history.

The user's structured summary uses active and confirmed entries. Guidance does not reuse that private summary: it builds a separate bounded overview only from entries explicitly visible to Guidance. Matching remains a third, narrower projection. Completeness measures coverage—not a person's psychological value—with capped weights for relationship goals, values, interests, communication, preferences, boundaries, emotional needs, and personality.

Extraction drains long histories in bounded batches without marking a job complete while messages remain. Deterministic parsing augments the LLM pass instead of short-circuiting it. Contradictions require owned entries, matching categories, user-message evidence, and a corresponding replacement entry; confirmed information is never superseded automatically. Strong same-category lexical equivalents are merged conservatively, and the confidence exposed for old AI inferences decays over time while explicit and confirmed facts retain their authority.

## Configuration

```env
SOULPRINT_EXTRACTION_ENABLED=true
SOULPRINT_EXTRACTION_MIN_USER_MESSAGES=1
SOULPRINT_EXTRACTION_MIN_CHARACTERS=300
SOULPRINT_EXTRACTION_DEBOUNCE_SECONDS=2
SOULPRINT_EXTRACTION_MAX_MESSAGES=20
SOULPRINT_EXTRACTION_TIMEOUT_MS=120000
SOULPRINT_JOB_POLL_INTERVAL_MS=2000
SOULPRINT_JOB_CONCURRENCY=4
SOULPRINT_JOB_MAX_ATTEMPTS=5
SOULPRINT_JOB_BACKOFF_BASE_MS=5000
SOULPRINT_JOB_STALE_MS=300000
SOULPRINT_AUTO_CONFIRM_DIRECT_FACTS=true
SOULPRINT_AUTO_SUMMARY_ENABLED=true
SOULPRINT_SUMMARY_CHANGE_THRESHOLD=3
SOULPRINT_MAX_GUIDANCE_ENTRIES=25
SOULPRINT_HISTORY_ENABLED=true
SOULPRINT_PROMPT_VERSION=v3
```

LLM configuration remains the same as Guidance. Local development uses `LLM_PROVIDER=ollama` and `LLM_MODEL=llama3.1:8b`; DeepSeek requires only provider, base URL, model, and API-key environment changes.

## Authenticated API

All paths are prefixed by `/api/v1` and derive ownership from the access JWT:

| Method | Path | Purpose |
| --- | --- | --- |
| GET | `/soulprint` | Soulprint with non-deleted entries |
| GET | `/soulprint/summary` | Summary, completeness, version |
| GET | `/soulprint/entries` | Filtered cursor-paginated entries |
| GET | `/soulprint/entries/:id` | Owned entry with evidence/history |
| POST | `/soulprint/entries` | Manual entry |
| PATCH | `/soulprint/entries/:id` | Correct an entry |
| DELETE | `/soulprint/entries/:id` | Soft-delete an entry |
| POST | `/soulprint/entries/:id/confirm` | Confirm, optionally with `correctedValue` |
| POST | `/soulprint/entries/:id/reject` | Reject an entry |
| PATCH | `/soulprint/entries/:id/visibility` | Change consent |
| GET | `/soulprint/pending` | Pending confirmations |
| GET | `/soulprint/history` | Cursor-paginated changes |
| GET | `/soulprint/extraction-status` | Current user's persistent extraction job status |
| GET | `/soulprint/extraction-metrics` | Aggregated extraction metrics (admin only) |
| POST | `/soulprint/recalculate` | Rebuild summary/completeness |
| POST | `/soulprint/extract` | Manual extraction in development or for admins |

Entry filters: `category`, `status`, `source`, `visibility`, `sensitivity`, `cursor`, and `limit`.

## Operations and tests

Apply the additive migration and regenerate the native Prisma client:

```bash
pnpm prisma:deploy
pnpm prisma:generate
pnpm build
pnpm lint
pnpm test
```

Tests mock `LlmProvider`; neither Ollama nor DeepSeek is required.
