# Guidance mobile

The mobile app talks only to the Soulmeet NestJS API through the existing Axios client. Access and refresh tokens remain in Expo SecureStore and the existing request/refresh interceptors attach them automatically.

```env
EXPO_PUBLIC_API_URL=http://192.168.1.10:3000/api/v1
```

No LLM URL, model, provider, or API key belongs in Expo variables or frontend source. Ollama, DeepSeek, and OpenAI configuration is exclusively owned by the backend.

Guidance server data is held by TanStack Query. Zustand contains only ephemeral UI state (selected mode and per-conversation drafts), never a second message history. Drafts use SecureStore on Android/iOS and a memory-only fallback on web.

Selecting a suggestion creates a conversation, stores its English starter as an editable draft, selects its mode, and opens the chat. It never sends automatically. Chat first attempts the backend SSE endpoint and falls back to the non-streamed endpoint only if streaming fails before the user message is acknowledged. The stop control aborts the active mobile request.
