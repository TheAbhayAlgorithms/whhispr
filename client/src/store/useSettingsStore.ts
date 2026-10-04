import { create } from 'zustand';
import { ActiveSession, NotificationPreferences, PrivacyPreferences } from '../types/settings';
import { apiRequest } from '../lib/api';

const NOTIF_PREFS_KEY = 'beacon_notif_prefs';
const PRIVACY_PREFS_KEY = 'beacon_privacy_prefs';

function loadNotifPrefs(): NotificationPreferences {
  try {
    const raw = localStorage.getItem(NOTIF_PREFS_KEY);
    if (raw) return JSON.parse(raw);
  } catch {}
  return {
    messageSounds: true,
    callRingtone: true,
    messagePreview: true,
    desktopNotifications: false,
  };
}

function loadPrivacyPrefs(): PrivacyPreferences {
  try {
    const raw = localStorage.getItem(PRIVACY_PREFS_KEY);
    if (raw) return JSON.parse(raw);
  } catch {}
  return {
    readReceipts: true,
    showOnlineStatus: true,
    showLastSeen: true,
  };
}

interface SettingsState {
  sessions: ActiveSession[];
  isLoadingSessions: boolean;
  isUpdatingPassword: boolean;
  isDeletingAccount: boolean;
  actionMessage: { type: 'success' | 'error'; text: string } | null;
  notifPrefs: NotificationPreferences;
  privacyPrefs: PrivacyPreferences;

  fetchSessions: () => Promise<void>;
  revokeSession: (sessionId: string) => Promise<void>;
  revokeOtherSessions: () => Promise<void>;
  changePassword: (currentPassword: string, newPassword: string) => Promise<void>;
  deleteAccount: (password: string) => Promise<void>;
  updateNotifPrefs: (prefs: Partial<NotificationPreferences>) => void;
  updatePrivacyPrefs: (prefs: Partial<PrivacyPreferences>) => void;
  clearActionMessage: () => void;
}

export const useSettingsStore = create<SettingsState>((set, get) => ({
  sessions: [],
  isLoadingSessions: false,
  isUpdatingPassword: false,
  isDeletingAccount: false,
  actionMessage: null,
  notifPrefs: loadNotifPrefs(),
  privacyPrefs: loadPrivacyPrefs(),

  clearActionMessage: () => set({ actionMessage: null }),

  fetchSessions: async () => {
    set({ isLoadingSessions: true });
    try {
      const res = await apiRequest<{ success: boolean; data: { sessions: ActiveSession[] } }>(
        '/api/v1/settings/sessions',
      );
      set({ sessions: res.data.sessions, isLoadingSessions: false });
    } catch (err: unknown) {
      const text = err instanceof Error ? err.message : 'Failed to load sessions';
      set({ isLoadingSessions: false, actionMessage: { type: 'error', text } });
    }
  },

  revokeSession: async (sessionId: string) => {
    try {
      await apiRequest(`/api/v1/settings/sessions/${sessionId}`, { method: 'DELETE' });
      set((state) => ({
        sessions: state.sessions.filter((s) => s.id !== sessionId),
        actionMessage: { type: 'success', text: 'Session successfully revoked.' },
      }));
    } catch (err: unknown) {
      const text = err instanceof Error ? err.message : 'Failed to revoke session';
      set({ actionMessage: { type: 'error', text } });
    }
  },

  revokeOtherSessions: async () => {
    try {
      const res = await apiRequest<{ success: boolean; message: string }>(
        '/api/v1/settings/sessions',
        { method: 'DELETE' },
      );
      // Retain only current session
      set((state) => ({
        sessions: state.sessions.filter((s) => s.isCurrent),
        actionMessage: { type: 'success', text: res.message || 'All other sessions revoked.' },
      }));
    } catch (err: unknown) {
      const text = err instanceof Error ? err.message : 'Failed to revoke other sessions';
      set({ actionMessage: { type: 'error', text } });
    }
  },

  changePassword: async (currentPassword: string, newPassword: string) => {
    set({ isUpdatingPassword: true, actionMessage: null });
    try {
      const res = await apiRequest<{ success: boolean; message: string }>(
        '/api/v1/settings/password',
        {
          method: 'PATCH',
          body: JSON.stringify({ currentPassword, newPassword }),
        },
      );
      set({
        isUpdatingPassword: false,
        actionMessage: { type: 'success', text: res.message || 'Password updated successfully!' },
      });
    } catch (err: unknown) {
      const text = err instanceof Error ? err.message : 'Failed to update password';
      set({ isUpdatingPassword: false, actionMessage: { type: 'error', text } });
      throw err;
    }
  },

  deleteAccount: async (password: string) => {
    set({ isDeletingAccount: true, actionMessage: null });
    try {
      await apiRequest('/api/v1/settings/account', {
        method: 'DELETE',
        body: JSON.stringify({ password, confirmText: 'DELETE' }),
      });
      set({ isDeletingAccount: false });
    } catch (err: unknown) {
      const text = err instanceof Error ? err.message : 'Failed to delete account';
      set({ isDeletingAccount: false, actionMessage: { type: 'error', text } });
      throw err;
    }
  },

  updateNotifPrefs: (prefs: Partial<NotificationPreferences>) => {
    const updated = { ...get().notifPrefs, ...prefs };
    try {
      localStorage.setItem(NOTIF_PREFS_KEY, JSON.stringify(updated));
    } catch {}
    set({ notifPrefs: updated });
  },

  updatePrivacyPrefs: (prefs: Partial<PrivacyPreferences>) => {
    const updated = { ...get().privacyPrefs, ...prefs };
    try {
      localStorage.setItem(PRIVACY_PREFS_KEY, JSON.stringify(updated));
    } catch {}
    set({ privacyPrefs: updated });
  },
}));
