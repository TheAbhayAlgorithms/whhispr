import { create } from 'zustand';
import { getSocket, disconnectSocket } from '../lib/socket';
import { useCallStore } from './useCallStore';
import { useNotificationStore } from './useNotificationStore';
import { IncomingCallPayload } from '../types/call';
import { NotificationItem } from '../types/notification';

export type SocketStatus = 'connected' | 'connecting' | 'disconnected';

export interface PresenceInfo {
  userId: string;
  status: 'online' | 'offline';
  lastSeen?: string | null;
}

interface SocketState {
  status: SocketStatus;
  onlineUsers: Record<string, PresenceInfo>;
  error: string | null;

  connect: () => void;
  disconnect: () => void;
  queryPresence: (userId: string) => Promise<PresenceInfo | null>;
  queryBatchPresence: (userIds: string[]) => Promise<void>;
  setPresence: (info: PresenceInfo) => void;
}

export const useSocketStore = create<SocketState>((set, get) => ({
  status: 'disconnected',
  onlineUsers: {},
  error: null,

  setPresence: (info: PresenceInfo) => {
    set((state) => ({
      onlineUsers: {
        ...state.onlineUsers,
        [info.userId]: info,
      },
    }));
  },

  connect: () => {
    const socket = getSocket();

    if (socket.connected) {
      set({ status: 'connected', error: null });
      return;
    }

    set({ status: 'connecting', error: null });

    socket.off('connect');
    socket.off('disconnect');
    socket.off('connect_error');
    socket.off('presence:init');
    socket.off('presence:update');
    socket.off('call:incoming');
    socket.off('call:answered');
    socket.off('call:ice_candidate');
    socket.off('call:rejected');
    socket.off('call:ended');
    socket.off('notification:new');
    socket.off('notification:badge');

    socket.on('connect', () => {
      set({ status: 'connected', error: null });
    });

    socket.on('disconnect', (reason) => {
      set({ status: 'disconnected' });
      if (reason === 'io server disconnect') {
        // the disconnection was initiated by the server, reconnect manually
        socket.connect();
      }
    });

    socket.on('connect_error', (err) => {
      set({ status: 'disconnected', error: err.message });
    });

    // Initial list of all currently online users received on connection
    socket.on('presence:init', (data: { onlineUserIds: string[] }) => {
      if (Array.isArray(data?.onlineUserIds)) {
        const presenceMap: Record<string, PresenceInfo> = {};
        for (const uid of data.onlineUserIds) {
          presenceMap[uid] = { userId: uid, status: 'online' };
        }
        set((state) => ({
          onlineUsers: {
            ...state.onlineUsers,
            ...presenceMap,
          },
        }));
      }
    });

    // Real-time presence updates (user goes online or offline)
    socket.on('presence:update', (data: PresenceInfo) => {
      get().setPresence(data);
    });

    // WebRTC call signaling events
    socket.on('call:incoming', (payload: IncomingCallPayload) => {
      useCallStore.getState().handleIncomingCall(payload);
    });

    socket.on('call:answered', (data: { recipientId: string; answer: RTCSessionDescriptionInit }) => {
      void useCallStore.getState().handleRemoteAnswer(data.answer);
    });

    socket.on('call:ice_candidate', (data: { senderId: string; candidate: RTCIceCandidateInit }) => {
      void useCallStore.getState().handleRemoteCandidate(data.candidate);
    });

    socket.on('call:rejected', (data: { recipientId: string; reason?: string }) => {
      useCallStore.getState().handleRemoteReject(data.reason);
    });

    socket.on('call:ended', (data: { senderId: string; duration?: number }) => {
      useCallStore.getState().handleRemoteEnd(data.duration);
    });

    // In-App Notification events
    socket.on('notification:new', (notif: NotificationItem) => {
      useNotificationStore.getState().handleIncomingNotification(notif);
    });

    socket.on('notification:badge', (data: { unreadCount: number }) => {
      useNotificationStore.getState().setUnreadCount(data.unreadCount);
    });

    socket.connect();
  },

  disconnect: () => {
    disconnectSocket();
    set({ status: 'disconnected', onlineUsers: {} });
  },

  queryPresence: async (userId: string): Promise<PresenceInfo | null> => {
    const socket = getSocket();
    if (!socket.connected) {
      return null;
    }

    return new Promise((resolve) => {
      socket.emit('presence:query', userId, (res: PresenceInfo) => {
        if (res) {
          get().setPresence(res);
          resolve(res);
        } else {
          resolve(null);
        }
      });
    });
  },

  queryBatchPresence: async (userIds: string[]): Promise<void> => {
    const socket = getSocket();
    if (!socket.connected || !userIds || userIds.length === 0) return;

    socket.emit('presence:query_batch', userIds, (presences: PresenceInfo[]) => {
      if (Array.isArray(presences)) {
        const presenceMap: Record<string, PresenceInfo> = {};
        for (const p of presences) {
          if (p?.userId) {
            presenceMap[p.userId] = p;
          }
        }
        set((state) => ({
          onlineUsers: {
            ...state.onlineUsers,
            ...presenceMap,
          },
        }));
      }
    });
  },
}));
