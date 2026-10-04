import { describe, it, expect, beforeEach, vi } from 'vitest';
import { useSettingsStore } from '../store/useSettingsStore';

describe('Settings State Management', () => {
  beforeEach(() => {
    useSettingsStore.setState({
      sessions: [],
      isLoadingSessions: false,
      isUpdatingPassword: false,
      isDeletingAccount: false,
      actionMessage: null,
      notifPrefs: {
        messageSounds: true,
        callRingtone: true,
        messagePreview: true,
        desktopNotifications: false,
      },
      privacyPrefs: {
        readReceipts: true,
        showOnlineStatus: true,
        showLastSeen: true,
      },
    });
    vi.restoreAllMocks();
  });

  it('initializes with default preferences and state', () => {
    const state = useSettingsStore.getState();
    expect(state.sessions).toEqual([]);
    expect(state.isLoadingSessions).toBe(false);
    expect(state.notifPrefs.messageSounds).toBe(true);
    expect(state.privacyPrefs.readReceipts).toBe(true);
  });

  it('updates notification preferences correctly', () => {
    useSettingsStore.getState().updateNotifPrefs({ messageSounds: false, messagePreview: false });
    const state = useSettingsStore.getState();
    expect(state.notifPrefs.messageSounds).toBe(false);
    expect(state.notifPrefs.messagePreview).toBe(false);
    expect(state.notifPrefs.callRingtone).toBe(true); // remains untouched
  });

  it('updates privacy preferences correctly', () => {
    useSettingsStore.getState().updatePrivacyPrefs({ readReceipts: false });
    const state = useSettingsStore.getState();
    expect(state.privacyPrefs.readReceipts).toBe(false);
    expect(state.privacyPrefs.showOnlineStatus).toBe(true);
  });

  it('clears action messages on demand', () => {
    useSettingsStore.setState({
      actionMessage: { type: 'success', text: 'Password updated' },
    });
    expect(useSettingsStore.getState().actionMessage).not.toBeNull();
    useSettingsStore.getState().clearActionMessage();
    expect(useSettingsStore.getState().actionMessage).toBeNull();
  });
});
