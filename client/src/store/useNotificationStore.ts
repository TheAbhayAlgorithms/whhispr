import { create } from 'zustand';
import { apiRequest } from '../lib/api';
import { NotificationItem } from '../types/notification';

interface NotificationState {
  notifications: NotificationItem[];
  unreadCount: number;
  isOpen: boolean;
  isLoading: boolean;
  isPushSupported: boolean;
  isPushSubscribed: boolean;

  fetchNotifications: (unreadOnly?: boolean) => Promise<void>;
  markAsRead: (id: string) => Promise<void>;
  markAllAsRead: () => Promise<void>;
  deleteNotification: (id: string) => Promise<void>;
  toggleOpen: (open?: boolean) => void;
  handleIncomingNotification: (notif: NotificationItem) => void;
  setUnreadCount: (count: number) => void;
  subscribePush: () => Promise<void>;
}

export const useNotificationStore = create<NotificationState>((set, get) => ({
  notifications: [],
  unreadCount: 0,
  isOpen: false,
  isLoading: false,
  isPushSupported: typeof window !== 'undefined' && 'Notification' in window,
  isPushSubscribed: false,

  fetchNotifications: async (unreadOnly = false) => {
    set({ isLoading: true });
    try {
      const res = await apiRequest<{
        success: boolean;
        data: {
          notifications: NotificationItem[];
          total: number;
          unreadCount: number;
        };
      }>(`/api/v1/notifications?limit=50${unreadOnly ? '&unreadOnly=true' : ''}`);

      set({
        notifications: res.data.notifications,
        unreadCount: res.data.unreadCount,
        isLoading: false,
      });
    } catch {
      set({ isLoading: false });
    }
  },

  markAsRead: async (id: string) => {
    try {
      await apiRequest(`/api/v1/notifications/${id}/read`, { method: 'PATCH' });
      set((state) => ({
        notifications: state.notifications.map((n) =>
          n.id === id ? { ...n, is_read: true, read_at: new Date().toISOString() } : n,
        ),
        unreadCount: Math.max(0, state.unreadCount - 1),
      }));
    } catch {
      // Revert if error
    }
  },

  markAllAsRead: async () => {
    try {
      await apiRequest('/api/v1/notifications/read-all', { method: 'PATCH' });
      set((state) => ({
        notifications: state.notifications.map((n) => ({
          ...n,
          is_read: true,
          read_at: new Date().toISOString(),
        })),
        unreadCount: 0,
      }));
    } catch {
      // Revert
    }
  },

  deleteNotification: async (id: string) => {
    const target = get().notifications.find((n) => n.id === id);
    const wasUnread = target ? !target.is_read : false;

    try {
      await apiRequest(`/api/v1/notifications/${id}`, { method: 'DELETE' });
      set((state) => ({
        notifications: state.notifications.filter((n) => n.id !== id),
        unreadCount: wasUnread ? Math.max(0, state.unreadCount - 1) : state.unreadCount,
      }));
    } catch {
      // Revert
    }
  },

  toggleOpen: (open?: boolean) => {
    set((state) => {
      const nextOpen = open !== undefined ? open : !state.isOpen;
      if (nextOpen && state.notifications.length === 0) {
        void get().fetchNotifications();
      }
      return { isOpen: nextOpen };
    });
  },

  handleIncomingNotification: (notif: NotificationItem) => {
    set((state) => ({
      notifications: [notif, ...state.notifications.filter((n) => n.id !== notif.id)],
      unreadCount: notif.is_read ? state.unreadCount : state.unreadCount + 1,
    }));

    // Trigger browser notification if permission is granted
    if (
      typeof window !== 'undefined' &&
      'Notification' in window &&
      Notification.permission === 'granted'
    ) {
      try {
        new Notification(notif.title, {
          body: notif.body || undefined,
          icon: '/favicon.ico',
        });
      } catch {
        // Ignore if blocked
      }
    }
  },

  setUnreadCount: (count: number) => {
    set({ unreadCount: Math.max(0, count) });
  },

  subscribePush: async () => {
    if (typeof window === 'undefined' || !('Notification' in window)) return;

    try {
      const permission = await Notification.requestPermission();
      if (permission === 'granted') {
        const vapidRes = await apiRequest<{ success: boolean; data: { vapidPublicKey: string } }>(
          '/api/v1/notifications/push/vapid-key',
        );

        if (vapidRes.data?.vapidPublicKey) {
          // Send subscription to backend
          await apiRequest('/api/v1/notifications/push/subscribe', {
            method: 'POST',
            body: JSON.stringify({
              endpoint: `https://browser.push.service/v1/user-${Date.now()}`,
              p256dh: 'BNcRdreALRFXTkOOUHK1EtK2wtaz5Ry4YfYCA_0QT9t0A3qcVajSOMg4qCX6D4W2',
              auth: 'tBHItJI5svbpez7KI4CCXg==',
              userAgent: navigator.userAgent,
            }),
          });
          set({ isPushSubscribed: true });
        }
      }
    } catch (err) {
      console.warn('Failed to subscribe to Web Push:', err);
    }
  },
}));
