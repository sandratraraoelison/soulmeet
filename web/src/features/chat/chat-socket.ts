'use client';
import { io, type Socket } from 'socket.io-client';
import { CHAT_EVENTS } from './chat-events';

let socket: Socket | null = null;
let endpoint: { accessToken: string; socketUrl: string } | null = null;
let socketPromise: Promise<Socket> | null = null;
let socketReady = false;

async function sessionEndpoint(forceRefresh = false) {
  if (endpoint && !forceRefresh) return endpoint;
  const response = await fetch(`/api/session/token${forceRefresh ? '?refresh=1' : ''}`, { cache: 'no-store' });
  if (!response.ok) throw new Error('No active session');
  endpoint = (await response.json()) as { accessToken: string; socketUrl: string };
  return endpoint;
}

export function resetChatSocket() {
  socket?.removeAllListeners();
  socket?.disconnect();
  socket = null;
  endpoint = null;
  socketPromise = null;
  socketReady = false;
}

export const isChatSocketReady = () => socketReady && socket?.connected === true;

async function refreshSocketToken() {
  endpoint = null;
  const fresh = await sessionEndpoint(true);
  if (socket) socket.auth = { token: fresh.accessToken };
}

export function getChatSocket(): Promise<Socket> {
  if (socket) return Promise.resolve(socket);
  if (!socketPromise) {
    socketPromise = (async () => {
      const { accessToken, socketUrl } = await sessionEndpoint();
      const instance = io(socketUrl, {
        // Start with HTTP polling, which also works behind proxies that reject a
        // direct WebSocket handshake, then upgrade to WebSocket when available.
        transports: ['polling', 'websocket'],
        auth: { token: accessToken },
        autoConnect: false,
        reconnection: true,
        reconnectionAttempts: Infinity,
        reconnectionDelay: 1_000,
        reconnectionDelayMax: 5_000,
        timeout: 20_000,
      });
      instance.on('connect_error', () => {
        socketReady = false;
      });
      instance.on(CHAT_EVENTS.ready, () => {
        socketReady = true;
      });
      instance.on(CHAT_EVENTS.error, (payload?: { code?: string }) => {
        if (payload?.code !== 'UNAUTHORIZED') return;
        socketReady = false;
        void refreshSocketToken().then(() => instance.disconnect().connect()).catch(() => undefined);
      });
      instance.on('disconnect', (reason) => {
        socketReady = false;
        if (reason === 'io server disconnect') {
          setTimeout(() => {
            if (!instance.connected) instance.connect();
          }, 500);
        }
      });
      socket = instance;
      return instance;
    })().finally(() => {
      socketPromise = null;
    });
  }
  return socketPromise;
}

export function connectChatSocket(): Promise<Socket> {
  return getChatSocket().then(
    (instance) =>
      new Promise<Socket>((resolve, reject) => {
        if (isChatSocketReady()) {
          resolve(instance);
          return;
        }
        const deadline = Date.now() + 30_000;
        const listeners = new Set<() => void>();
        const onceEvent = (event: string, handler: (...args: unknown[]) => void) => {
          instance.once(event, handler as never);
          listeners.add(() => instance.off(event, handler as never));
        };
        const cleanup = () => listeners.forEach((off) => off());

        const tryConnect = () => {
          if (Date.now() > deadline) {
            clearTimeout(timer);
            cleanup();
            reject(new Error('You are offline. Try again in a moment.'));
            return;
          }
          onceEvent(CHAT_EVENTS.ready, () => {
            clearTimeout(timer);
            cleanup();
            resolve(instance);
          });
          onceEvent('connect_error', () => {
            cleanup();
            setTimeout(tryConnect, 250);
          });
          instance.connect();
        };
        const timer = setTimeout(() => {
          cleanup();
          reject(new Error('You are offline. Try again in a moment.'));
        }, 30_000);
        tryConnect();
      }),
  );
}
