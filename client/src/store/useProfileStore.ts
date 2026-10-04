import { create } from 'zustand';
import { FullProfile, PublicProfile, UpdateProfileInput } from '../types/profile';
import { apiRequest, getClientAccessToken, resolveApiUrl } from '../lib/api';
import { useAuthStore } from './useAuthStore';

interface ProfileState {
  profile: FullProfile | null;
  viewingProfile: PublicProfile | null;
  searchResults: PublicProfile[];
  isLoading: boolean;
  isSearching: boolean;
  error: string | null;

  fetchMyProfile: () => Promise<void>;
  updateProfile: (data: UpdateProfileInput) => Promise<void>;
  uploadAvatar: (file: File) => Promise<string>;
  removeAvatar: () => Promise<void>;
  fetchUserProfile: (userId: string) => Promise<void>;
  clearViewingProfile: () => void;
  searchUsers: (query: string) => Promise<void>;
  clearSearch: () => void;
}

export const useProfileStore = create<ProfileState>((set, get) => ({
  profile: null,
  viewingProfile: null,
  searchResults: [],
  isLoading: false,
  isSearching: false,
  error: null,

  clearViewingProfile: () => set({ viewingProfile: null }),
  clearSearch: () => set({ searchResults: [] }),

  fetchMyProfile: async () => {
    set({ isLoading: true, error: null });
    try {
      const res = await apiRequest<{ success: boolean; data: { profile: FullProfile } }>(
        '/api/v1/users/profile/me',
      );
      set({ profile: res.data.profile, isLoading: false });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to load profile';
      set({ error: message, isLoading: false });
    }
  },

  updateProfile: async (data: UpdateProfileInput) => {
    set({ isLoading: true, error: null });
    try {
      const res = await apiRequest<{ success: boolean; data: { profile: FullProfile } }>(
        '/api/v1/users/profile/me',
        {
          method: 'PATCH',
          body: JSON.stringify(data),
        },
      );
      set({ profile: res.data.profile, isLoading: false });

      // Keep auth user store display name in sync
      const authUser = useAuthStore.getState().user;
      if (authUser && res.data.profile.displayName) {
        useAuthStore.setState({
          user: {
            ...authUser,
            displayName: res.data.profile.displayName,
          },
        });
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to update profile';
      set({ error: message, isLoading: false });
      throw err;
    }
  },

  uploadAvatar: async (file: File): Promise<string> => {
    set({ isLoading: true, error: null });
    try {
      const formData = new FormData();
      formData.append('avatar', file);

      const token = getClientAccessToken();
      const res = await fetch(resolveApiUrl('/api/v1/users/profile/avatar'), {
        method: 'POST',
        headers: {
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: formData,
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData?.error?.message || 'Avatar upload failed');
      }

      const json = await res.json();
      const avatarUrl = json.data.avatarUrl as string;

      const current = get().profile;
      if (current) {
        set({ profile: { ...current, avatarUrl } });
      }

      const authUser = useAuthStore.getState().user;
      if (authUser) {
        useAuthStore.setState({
          user: { ...authUser, avatarUrl },
        });
      }

      set({ isLoading: false });
      return avatarUrl;
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Avatar upload failed';
      set({ error: message, isLoading: false });
      throw err;
    }
  },

  removeAvatar: async () => {
    set({ isLoading: true, error: null });
    try {
      await apiRequest('/api/v1/users/profile/avatar', {
        method: 'DELETE',
      });

      const current = get().profile;
      if (current) {
        set({ profile: { ...current, avatarUrl: null } });
      }

      const authUser = useAuthStore.getState().user;
      if (authUser) {
        useAuthStore.setState({
          user: { ...authUser, avatarUrl: null },
        });
      }

      set({ isLoading: false });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to remove avatar';
      set({ error: message, isLoading: false });
      throw err;
    }
  },

  fetchUserProfile: async (userId: string) => {
    set({ isLoading: true, error: null });
    try {
      const res = await apiRequest<{ success: boolean; data: { profile: PublicProfile } }>(
        `/api/v1/users/${userId}/profile`,
      );
      set({ viewingProfile: res.data.profile, isLoading: false });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to load user profile';
      set({ error: message, isLoading: false });
    }
  },

  searchUsers: async (queryStr: string) => {
    if (!queryStr.trim()) {
      set({ searchResults: [] });
      return;
    }
    set({ isSearching: true });
    try {
      const res = await apiRequest<{ success: boolean; data: { users: PublicProfile[] } }>(
        `/api/v1/users/search?q=${encodeURIComponent(queryStr.trim())}`,
      );
      set({ searchResults: res.data.users, isSearching: false });
    } catch {
      set({ searchResults: [], isSearching: false });
    }
  },
}));
