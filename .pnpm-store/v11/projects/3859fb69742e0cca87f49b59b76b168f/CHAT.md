# Soulmeet private chat

The chat module provides authenticated one-to-one text conversations over REST and Socket.IO. REST documentation is also available in Swagger at `/docs`.

## Authentication and connection

Use the same access JWT as the REST API. The gateway accepts `auth.token` or an `Authorization: Bearer TOKEN` handshake header. Invalid, expired, refresh, or disabled-user tokens are disconnected.

```ts
import { io } from 'socket.io-client';

const socket = io(API_URL, {
  auth: { token: accessToken },
});
```

Every authenticated socket automatically joins `user:{userId}`. After loading a conversation, join `conversation:{conversationId}` through the event below.

## REST API

| Method | Endpoint | Purpose |
| --- | --- | --- |
| `POST` | `/conversations/private` | Create or retrieve a unique private conversation |
| `GET` | `/conversations` | List conversations, other participant, latest message, and unread count |
| `GET` | `/conversations/:id` | Read a conversation as a participant |
| `GET` | `/conversations/:id/messages?cursor=&limit=20` | Read newest-first history; maximum 50 |
| `PATCH` | `/messages/:id` | Edit an owned, non-deleted message within 15 minutes |
| `DELETE` | `/messages/:id` | Soft-delete an owned message within 15 minutes |

All endpoints require `Authorization: Bearer ACCESS_TOKEN`. Deleted messages always return `content: null`.

## Client-to-server events

| Event | Payload | Acknowledgement |
| --- | --- | --- |
| `conversation:join` | `{ conversationId }` | `{ success, conversationId }` |
| `conversation:leave` | `{ conversationId }` | `{ success, conversationId }` |
| `message:send` | `{ conversationId, content, clientMessageId }` | `{ success, clientMessageId, message }` |
| `message:update` | `{ messageId, content }` | `{ success, ...message }` |
| `message:delete` | `{ messageId }` | `{ success, messageId, conversationId, deletedAt }` |
| `message:read` | `{ conversationId, messageIds }` | `{ success, conversationId, messageIds, readAt }` |
| `typing:start` | `{ conversationId }` | `{ success, conversationId }` |
| `typing:stop` | `{ conversationId }` | `{ success, conversationId }` |

Payloads are whitelisted and validated. Message content is trimmed, cannot be empty, and is limited to 2,000 characters. `clientMessageId` must be a UUID and makes sends idempotent per sender.

## Server-to-client events

- `conversation:joined`
- `message:created`
- `message:updated`
- `message:deleted`
- `message:delivered`
- `message:read`
- `typing:started`
- `typing:stopped`
- `chat:error`

Socket errors use this stable shape:

```ts
type ChatError = {
  event: string;
  code: string;
  message: string;
  details?: object;
};
```

Known codes include `UNAUTHORIZED`, `CONVERSATION_NOT_FOUND`, `FORBIDDEN_CONVERSATION`, `MESSAGE_NOT_FOUND`, `MESSAGE_NOT_OWNED`, `MESSAGE_ALREADY_DELETED`, `EDIT_WINDOW_EXPIRED`, `DELETE_WINDOW_EXPIRED`, `USER_BLOCKED`, `RATE_LIMITED`, and `VALIDATION_ERROR`.

## React Native example

```ts
socket.emit(
  'message:send',
  {
    conversationId,
    content: 'Bonjour !',
    clientMessageId: crypto.randomUUID(),
  },
  (response) => console.log(response),
);

socket.on('message:created', ({ message }) => console.log(message));
socket.on('message:updated', ({ message }) => console.log(message));
socket.on('message:deleted', ({ messageId }) => console.log(messageId));
socket.on('chat:error', (error) => console.warn(error.code, error.message));
```

## Testing with two users

1. Register/login two active users and retain both access tokens.
2. As user A, call `POST /conversations/private` with user B's id.
3. Open two Socket.IO clients using their respective access tokens.
4. Emit `conversation:join` from both clients with the returned conversation id.
5. Emit `message:send` from A and observe `message:created` on B and `message:delivered` on A.
6. Emit `message:read` from B and observe the receipt on A.
7. Test update/delete from A; B receives `message:updated` and `message:deleted` immediately.

For this MVP, an explicit request between two active, unblocked users authorizes creation because the repository has no Match model yet. Replace this policy in `ChatService.startPrivate` with the Match lookup when matching is persisted.
