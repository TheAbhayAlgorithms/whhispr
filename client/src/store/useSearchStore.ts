import { create } from 'zustand';
import { apiRequest } from '../lib/api';
import { SearchMessageResult, UnifiedSearchResult } from '../types/search';

interface SearchState {
  globalQuery: string;
  inChatQuery: string;
  inChatSearchOpen: boolean;
  isSearching: boolean;
  activeTab: 'all' | 'messages' | 'users' | 'chats';
  unifiedResults: UnifiedSearchResult;
  inChatResults: SearchMessageResult[];
  isInChatSearching: boolean;

  setGlobalQuery: (query: string) => void;
  setInChatQuery: (query: string) => void;
  setActiveTab: (tab: 'all' | 'messages' | 'users' | 'chats') => void;
  toggleInChatSearch: (open?: boolean) => void;
  searchGlobal: (queryStr: string) => Promise<void>;
  searchInChat: (chatId: string, queryStr: string) => Promise<void>;
  clearSearch: () => void;
}

const emptyUnifiedResults: UnifiedSearchResult = {
  messages: [],
  users: [],
  chats: [],
};

export const useSearchStore = create<SearchState>((set) => ({
  globalQuery: '',
  inChatQuery: '',
  inChatSearchOpen: false,
  isSearching: false,
  activeTab: 'all',
  unifiedResults: emptyUnifiedResults,
  inChatResults: [],
  isInChatSearching: false,

  setGlobalQuery: (query: string) => set({ globalQuery: query }),
  setInChatQuery: (query: string) => set({ inChatQuery: query }),
  setActiveTab: (tab) => set({ activeTab: tab }),

  toggleInChatSearch: (open?: boolean) =>
    set((state) => ({
      inChatSearchOpen: open !== undefined ? open : !state.inChatSearchOpen,
      inChatQuery: '',
      inChatResults: [],
    })),

  searchGlobal: async (queryStr: string) => {
    const trimmed = queryStr.trim();
    if (!trimmed) {
      set({ unifiedResults: emptyUnifiedResults, isSearching: false });
      return;
    }

    set({ isSearching: true });
    try {
      const res = await apiRequest<{ success: boolean; data: UnifiedSearchResult }>(
        `/api/v1/search?q=${encodeURIComponent(trimmed)}&limit=15`,
      );
      set({ unifiedResults: res.data, isSearching: false });
    } catch {
      set({ isSearching: false });
    }
  },

  searchInChat: async (chatId: string, queryStr: string) => {
    const trimmed = queryStr.trim();
    if (!trimmed) {
      set({ inChatResults: [], isInChatSearching: false });
      return;
    }

    set({ isInChatSearching: true });
    try {
      const res = await apiRequest<{
        success: boolean;
        data: { messages: SearchMessageResult[]; total: number };
      }>(`/api/v1/search/messages?q=${encodeURIComponent(trimmed)}&chatId=${chatId}&limit=50`);
      set({ inChatResults: res.data.messages, isInChatSearching: false });
    } catch {
      set({ inChatResults: [], isInChatSearching: false });
    }
  },

  clearSearch: () =>
    set({
      globalQuery: '',
      inChatQuery: '',
      unifiedResults: emptyUnifiedResults,
      inChatResults: [],
      isSearching: false,
      isInChatSearching: false,
    }),
}));
