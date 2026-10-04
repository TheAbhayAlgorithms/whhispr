import { describe, it, expect, beforeEach, vi } from 'vitest';
import { useAuthStore } from '../store/useAuthStore';
import { setClientAccessToken, getClientAccessToken } from '../lib/api';

describe('Auth State Management', () => {
  beforeEach(() => {
    setClientAccessToken(null);
    useAuthStore.setState({
      user: null,
      isAuthenticated: false,
      isLoading: false,
      error: null,
    });
    vi.restoreAllMocks();
  });

  it('initializes with unauthenticated state', () => {
    const state = useAuthStore.getState();
    expect(state.isAuthenticated).toBe(false);
    expect(state.user).toBeNull();
    expect(getClientAccessToken()).toBeNull();
  });

  it('manages access token in local storage', () => {
    setClientAccessToken('mock_token_123');
    expect(getClientAccessToken()).toBe('mock_token_123');

    setClientAccessToken(null);
    expect(getClientAccessToken()).toBeNull();
  });

  it('clears error correctly', () => {
    useAuthStore.setState({ error: 'Some error' });
    expect(useAuthStore.getState().error).toBe('Some error');

    useAuthStore.getState().clearError();
    expect(useAuthStore.getState().error).toBeNull();
  });
});
