import { create } from 'zustand';
import { User, AuthSuccessPayload } from '../types/auth';
import { apiRequest, setClientAccessToken } from '../lib/api';

interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;

  login: (identifier: string, password: string) => Promise<void>;
  register: (
    username: string,
    email: string,
    password: string,
    displayName?: string,
  ) => Promise<void>;
  logout: () => Promise<void>;
  initAuth: () => Promise<void>;
  clearError: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  isAuthenticated: false,
  isLoading: true,
  error: null,

  clearError: () => set({ error: null }),

  login: async (identifier, password) => {
    set({ isLoading: true, error: null });
    try {
      const res = await apiRequest<{ success: boolean; data: AuthSuccessPayload }>(
        '/api/v1/auth/login',
        {
          method: 'POST',
          body: JSON.stringify({ identifier, password }),
          skipAuth: true,
        },
      );

      setClientAccessToken(res.data.accessToken);
      set({
        user: res.data.user,
        isAuthenticated: true,
        isLoading: false,
        error: null,
      });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Login failed';
      set({ error: message, isLoading: false, isAuthenticated: false });
      throw err;
    }
  },

  register: async (username, email, password, displayName) => {
    set({ isLoading: true, error: null });
    try {
      const res = await apiRequest<{ success: boolean; data: AuthSuccessPayload }>(
        '/api/v1/auth/register',
        {
          method: 'POST',
          body: JSON.stringify({ username, email, password, displayName }),
          skipAuth: true,
        },
      );

      setClientAccessToken(res.data.accessToken);
      set({
        user: res.data.user,
        isAuthenticated: true,
        isLoading: false,
        error: null,
      });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Registration failed';
      set({ error: message, isLoading: false, isAuthenticated: false });
      throw err;
    }
  },

  logout: async () => {
    try {
      await apiRequest('/api/v1/auth/logout', { method: 'POST' });
    } catch {
      // Ignore logout errors
    } finally {
      setClientAccessToken(null);
      set({ user: null, isAuthenticated: false, isLoading: false, error: null });
    }
  },

  initAuth: async () => {
    set({ isLoading: true });
    try {
      const res = await apiRequest<{ success: boolean; data: { user: User } }>('/api/v1/auth/me');
      set({
        user: res.data.user,
        isAuthenticated: true,
        isLoading: false,
      });
    } catch {
      setClientAccessToken(null);
      set({
        user: null,
        isAuthenticated: false,
        isLoading: false,
      });
    }
  },
}));
