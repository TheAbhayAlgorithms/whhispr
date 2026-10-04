import { io, Socket } from 'socket.io-client';
import { getClientAccessToken } from './api';

let socket: Socket | null = null;

const SOCKET_URL = import.meta.env.VITE_API_URL || 'http://localhost:4000';

export function getSocket(): Socket {
  if (!socket) {
    socket = io(SOCKET_URL, {
      autoConnect: false,
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionAttempts: 15,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      auth: (cb) => {
        cb({ token: getClientAccessToken() || '' });
      },
    });
  }
  return socket;
}

export function disconnectSocket(): void {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
}
