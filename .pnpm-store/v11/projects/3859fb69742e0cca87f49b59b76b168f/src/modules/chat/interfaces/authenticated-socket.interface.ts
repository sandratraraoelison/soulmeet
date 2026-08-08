import type { Socket } from 'socket.io';

export interface AuthenticatedSocket extends Socket {
  data: { user: { id: string; email: string } };
}
