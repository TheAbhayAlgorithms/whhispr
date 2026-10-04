import { describe, it, expect, beforeEach } from 'vitest';
import { useSocketStore } from '../store/useSocketStore';

describe('useSocketStore', () => {
  beforeEach(() => {
    useSocketStore.setState({
      status: 'disconnected',
      onlineUsers: {},
      error: null,
    });
  });

  it('initializes with disconnected status', () => {
    const state = useSocketStore.getState();
    expect(state.status).toBe('disconnected');
    expect(state.onlineUsers).toEqual({});
    expect(state.error).toBeNull();
  });

  it('updates presence for user', () => {
    const { setPresence } = useSocketStore.getState();

    setPresence({
      userId: 'user-1',
      status: 'online',
      lastSeen: new Date().toISOString(),
    });

    const updated = useSocketStore.getState().onlineUsers;
    expect(updated['user-1']).toBeDefined();
    expect(updated['user-1'].status).toBe('online');
  });

  it('resets state on disconnect', () => {
    useSocketStore.setState({
      status: 'connected',
      onlineUsers: {
        'user-1': { userId: 'user-1', status: 'online' },
      },
    });

    useSocketStore.getState().disconnect();

    const state = useSocketStore.getState();
    expect(state.status).toBe('disconnected');
    expect(state.onlineUsers).toEqual({});
  });
});
