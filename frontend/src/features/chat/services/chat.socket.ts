import { io, type Socket } from 'socket.io-client';
import { API_URL } from '@/api/client';
import { tokenStorage } from '@/services/token-storage.service';

let socket: Socket | null = null;

export async function getChatSocket() {
  if (socket) return socket;
  const { accessToken } = await tokenStorage.get();
  socket = io(API_URL ? new URL(API_URL).origin : '', {
    transports: ['websocket'],
    auth: { token: accessToken },
    autoConnect: false,
    reconnection: true,
    reconnectionAttempts: 10,
    reconnectionDelay: 1_000,
  });
  return socket;
}

export async function connectChatSocket() {
  const instance = await getChatSocket();
  if (!instance.connected) instance.connect();
  return instance;
}

export function disconnectChatSocket() {
  socket?.removeAllListeners();
  socket?.disconnect();
  socket = null;
}
