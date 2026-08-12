# Soulmeet Guidance API

Guidance is the authenticated chat between one user and their personal AI coach. It uses dedicated persistence and does not change the existing private user-to-user chat contracts.

## Configuration

Local Ollama defaults:

```env
LLM_PROVIDER=ollama
LLM_BASE_URL=http://localhost:11434
LLM_MODEL=llama3.1:8b
LLM_API_KEY=
LLM_TIMEOUT_MS=60000
```

Run `ollama pull llama3.1:8b` and ensure Ollama is listening before sending a message.

DeepSeek:

```env
LLM_PROVIDER=deepseek
LLM_BASE_URL=https://api.deepseek.com
LLM_MODEL=deepseek-chat
LLM_MAX_CONCURRENCY=12
LLM_MAX_QUEUE_SIZE=100
LLM_QUEUE_TIMEOUT_MS=30000
LLM_INTERACTIVE_BURST=8
LLM_API_KEY=your-secret-key
```

OpenAI or another OpenAI-compatible API uses the same variables with `LLM_PROVIDER=openai` or `openai-compatible`, the provider base URL, model, and key. No application code change is required.

## Endpoints

All routes are prefixed with `/api/v1` and require `Authorization: Bearer ACCESS_TOKEN`. Ownership is derived exclusively from that token.

| Method | Endpoint | Purpose |
| --- | --- | --- |
| `POST` | `/guidance/conversations` | Create a conversation |
| `GET` | `/guidance/conversations?cursor=&limit=20` | List conversations |
| `GET` | `/guidance/conversations/:id/messages?cursor=&limit=20` | Read history |
| `POST` | `/guidance/conversations/:id/messages` | Save a user message and return a complete AI response |
| `POST` | `/guidance/conversations/:id/messages/stream` | Save a user message and stream the AI response as SSE |
| `PATCH` | `/guidance/messages/:id` | Edit an owned user message |
| `DELETE` | `/guidance/messages/:id` | Soft-delete an owned message |
| `POST` | `/guidance/messages/:id/regenerate` | Replace an assistant response |
| `GET/POST` | `/guidance/memories` | List or create memories |
| `PATCH/DELETE` | `/guidance/memories/:id` | Update or delete a memory |
Soulprint is managed through the dedicated authenticated `/api/v1/soulprint` API documented in [SOULPRINT.md](./SOULPRINT.md).

Message bodies use `{ "content": "..." }`. Conversation creation accepts an optional `{ "title": "..." }`.

The streaming endpoint returns `text/event-stream` events: `message` for the saved user message, one or more `token` events, then `complete` with the saved assistant message. Failures emit an `error` event. AI-generating routes are limited to 10 requests per minute per throttler identity.

The system prompt includes coach traits and levels, the user's profile, up to 20 recent explicit memories, and their Soulprint summary. Up to 40 conversation messages are sent as context. Deleted message content is never included.

Coach personalization is behavioral. Selected traits and the four 0–100 levels generate explicit instructions controlling vocabulary, response length, humor, energy, emotional validation, candor, question frequency, advice delivery, reassurance, gentle challenge, and emoji use. For example, `DIRECT` + `MORE_DIRECTIVE` favors concise recommendations and few questions, while `SOFT` + `THERAPIST` + `LESS_DIRECTIVE` favors reflective questions, reassurance, and permission before confrontation. Conflicting traits are resolved together with the numeric levels and the user's current emotional context.

Apply the database migration before starting the updated API:

```bash
pnpm prisma:generate
pnpm prisma:deploy
```
