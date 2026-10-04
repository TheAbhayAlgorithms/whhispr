import { describe, it, expect, beforeEach, vi } from 'vitest';
import { useSearchStore } from '../store/useSearchStore';
import * as apiModule from '../lib/api';

vi.mock('../lib/api', () => ({
  apiRequest: vi.fn(),
}));

describe('useSearchStore', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useSearchStore.getState().clearSearch();
    useSearchStore.setState({ inChatSearchOpen: false, activeTab: 'all' });
  });

  it('initializes with default values', () => {
    const state = useSearchStore.getState();
    expect(state.globalQuery).toBe('');
    expect(state.inChatQuery).toBe('');
    expect(state.inChatSearchOpen).toBe(false);
    expect(state.isSearching).toBe(false);
    expect(state.activeTab).toBe('all');
    expect(state.unifiedResults.messages).toHaveLength(0);
    expect(state.unifiedResults.users).toHaveLength(0);
    expect(state.unifiedResults.chats).toHaveLength(0);
  });

  it('updates global and in-chat queries', () => {
    useSearchStore.getState().setGlobalQuery('design');
    expect(useSearchStore.getState().globalQuery).toBe('design');

    useSearchStore.getState().setInChatQuery('spec');
    expect(useSearchStore.getState().inChatQuery).toBe('spec');

    useSearchStore.getState().setActiveTab('messages');
    expect(useSearchStore.getState().activeTab).toBe('messages');
  });

  it('toggles inChatSearchOpen state', () => {
    expect(useSearchStore.getState().inChatSearchOpen).toBe(false);
    useSearchStore.getState().toggleInChatSearch();
    expect(useSearchStore.getState().inChatSearchOpen).toBe(true);

    useSearchStore.getState().toggleInChatSearch(false);
    expect(useSearchStore.getState().inChatSearchOpen).toBe(false);
  });

  it('clears results when searching with empty query', async () => {
    await useSearchStore.getState().searchGlobal('   ');
    expect(apiModule.apiRequest).not.toHaveBeenCalled();
    expect(useSearchStore.getState().unifiedResults.messages).toHaveLength(0);
  });

  it('populates unified results on successful searchGlobal', async () => {
    const mockData = {
      messages: [{ id: 'm1', content: 'test message', chat_id: 'c1' }],
      users: [{ id: 'u1', username: 'alice', display_name: 'Alice' }],
      chats: [{ id: 'c1', name: 'General', type: 'group' }],
    };

    vi.mocked(apiModule.apiRequest).mockResolvedValueOnce({
      success: true,
      data: mockData,
    });

    await useSearchStore.getState().searchGlobal('test');

    expect(apiModule.apiRequest).toHaveBeenCalledWith('/api/v1/search?q=test&limit=15');
    const state = useSearchStore.getState();
    expect(state.unifiedResults.messages).toHaveLength(1);
    expect(state.unifiedResults.users).toHaveLength(1);
    expect(state.unifiedResults.chats).toHaveLength(1);
    expect(state.isSearching).toBe(false);
  });

  it('handles in-chat search requests correctly', async () => {
    const mockMessages = [
      { id: 'm2', content: 'meeting at 3pm', chat_id: 'c1' },
      { id: 'm3', content: 'project deadline', chat_id: 'c1' },
    ];

    vi.mocked(apiModule.apiRequest).mockResolvedValueOnce({
      success: true,
      data: { messages: mockMessages, total: 2 },
    });

    await useSearchStore.getState().searchInChat('c1', 'meeting');

    expect(apiModule.apiRequest).toHaveBeenCalledWith(
      '/api/v1/search/messages?q=meeting&chatId=c1&limit=50',
    );
    expect(useSearchStore.getState().inChatResults).toHaveLength(2);
    expect(useSearchStore.getState().isInChatSearching).toBe(false);
  });

  it('resets state on clearSearch', () => {
    useSearchStore.setState({
      globalQuery: 'foo',
      inChatQuery: 'bar',
      isSearching: true,
      isInChatSearching: true,
    });

    useSearchStore.getState().clearSearch();

    const state = useSearchStore.getState();
    expect(state.globalQuery).toBe('');
    expect(state.inChatQuery).toBe('');
    expect(state.isSearching).toBe(false);
    expect(state.isInChatSearching).toBe(false);
  });
});
