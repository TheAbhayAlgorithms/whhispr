import { describe, it, expect, beforeEach, vi } from 'vitest';
import { useProfileStore } from '../store/useProfileStore';

describe('Profile State Management', () => {
  beforeEach(() => {
    useProfileStore.setState({
      profile: null,
      viewingProfile: null,
      searchResults: [],
      isLoading: false,
      isSearching: false,
      error: null,
    });
    vi.restoreAllMocks();
  });

  it('initializes with default empty state', () => {
    const state = useProfileStore.getState();
    expect(state.profile).toBeNull();
    expect(state.viewingProfile).toBeNull();
    expect(state.searchResults).toEqual([]);
    expect(state.isLoading).toBe(false);
  });

  it('manages viewing profile clear action', () => {
    useProfileStore.setState({
      viewingProfile: {
        userId: '123',
        username: 'bob',
        displayName: 'Bob M',
        avatarUrl: null,
        bio: 'Hello',
        statusMessage: 'Online',
        lastSeen: null,
        isContact: true,
        canAdd: true,
      },
    });

    expect(useProfileStore.getState().viewingProfile).not.toBeNull();
    useProfileStore.getState().clearViewingProfile();
    expect(useProfileStore.getState().viewingProfile).toBeNull();
  });

  it('clears search results', () => {
    useProfileStore.setState({
      searchResults: [
        {
          userId: '123',
          username: 'bob',
          displayName: 'Bob M',
          avatarUrl: null,
          bio: 'Hello',
          statusMessage: 'Online',
          lastSeen: null,
          isContact: false,
          canAdd: true,
        },
      ],
    });

    expect(useProfileStore.getState().searchResults.length).toBe(1);
    useProfileStore.getState().clearSearch();
    expect(useProfileStore.getState().searchResults.length).toBe(0);
  });
});
