# Chat mobile Soulmeet

## Configuration

Create or update `.env` in `frontend`:

```env
EXPO_PUBLIC_API_URL=http://192.168.X.X:3000
```

Use the computer's local IPv4 address for a physical phone, never `localhost`. The phone and computer must use the same Wi-Fi network, Windows Firewall must allow port 3000, and NestJS must listen on `0.0.0.0` for access outside the computer. Restart Expo after changing an `EXPO_PUBLIC_*` variable.

## Manual test with two users

1. Start PostgreSQL and the backend, then start Expo with `npx expo start`.
2. Sign in with two different completed accounts on two devices, or one device and one emulator.
3. Create/retrieve a private conversation once real match user ids are available.
4. Open Soul on both clients and select the same conversation.
5. Send a message and verify immediate delivery plus delivered/read check marks.
6. Long-press the sent message, edit it, and verify both clients update.
7. Delete it and verify neither client reveals the original content.
8. Type without sending and verify the remote `écrit…` indicator disappears after inactivity.
9. Disable the network, verify the reconnecting banner and retained history, then reconnect and confirm resynchronization.

## Contract notes

The backend returns `messages: Message[]` and nested participant profiles rather than explicit `lastMessage` and `otherParticipant` fields. `chat.api.ts` maps that real response into the UI model.

The compatibility profiles in Soul are fixtures and do not contain real backend user ids. They keep the existing preview chat. Real private chats appear in Conversations as soon as a backend conversation exists. When matchmaking persists user ids, call `chatApi.createPrivateConversation(participantId)` before navigating to `/conversation/:conversationId`.
