import { create } from 'zustand';
import { apiRequest, getClientAccessToken, resolveApiUrl } from '../lib/api';
import { getSocket } from '../lib/socket';
import { Chat, ChatMessage, GroupDetails, PublicChannel, MessageAttachment, MessageReaction } from '../types/chat';
import { useAuthStore } from './useAuthStore';

export interface AttachmentInput {
  fileName: string;
  fileSize: number;
  mimeType: string;
  storageKey: string;
  width?: number;
  height?: number;
  duration?: number;
}

interface ChatStoreState {
  chats: Chat[];
  activeChatId: string | null;
  activeGroupDetails: GroupDetails | null;
  publicChannels: PublicChannel[];
  messages: Record<string, ChatMessage[]>;
  cursors: Record<string, string | null>;
  hasMore: Record<string, boolean>;
  isLoadingChats: boolean;
  isLoadingMessages: boolean;
  isLoadingGroupDetails: boolean;
  isBrowsingChannels: boolean;
  isSending: boolean;
  error: string | null;
  typingUsers: Record<string, string[]>;

  fetchChats: () => Promise<void>;
  selectChat: (chatId: string | null) => Promise<void>;
  getOrCreateDirectChat: (targetUserId: string) => Promise<Chat>;
  fetchMessages: (chatId: string, loadMore?: boolean) => Promise<void>;
  sendMessage: (
    chatId: string,
    content: string,
    replyToId?: string,
    attachments?: AttachmentInput[],
    type?: string,
  ) => Promise<ChatMessage | null>;
  uploadMedia: (file: File) => Promise<MessageAttachment>;
  markChatAsRead: (chatId: string) => Promise<void>;
  setTyping: (chatId: string, username: string, isTyping: boolean) => void;
  handleMessageStatusUpdated: (data: {
    chatId: string;
    userId: string;
    status: 'sent' | 'delivered' | 'read';
    messageIds?: string[];
  }) => void;
  toggleReaction: (messageId: string, emoji: string) => Promise<void>;
  handleReactionUpdated: (data: {
    messageId: string;
    chatId: string;
    userId: string;
    emoji: string;
    action: 'added' | 'removed';
    reactions: MessageReaction[];
  }) => void;
  replyingTo: ChatMessage | null;
  editingMessage: ChatMessage | null;
  setReplyingTo: (msg: ChatMessage | null) => void;
  setEditingMessage: (msg: ChatMessage | null) => void;
  editMessage: (messageId: string, content: string) => Promise<void>;
  deleteMessage: (messageId: string, mode?: 'me' | 'everyone') => Promise<void>;
  handleMessageUpdated: (updatedMsg: ChatMessage) => void;
  handleMessageDeleted: (data: { messageId: string; chatId: string; deleteType: 'me' | 'everyone' }) => void;
  handleIncomingMessage: (msg: ChatMessage) => void;
  setupSocketListeners: () => () => void;

  // Group & Channel Features
  fetchGroupDetails: (chatId: string) => Promise<GroupDetails | null>;
  createGroup: (data: {
    name: string;
    description?: string;
    avatarUrl?: string | null;
    memberIds?: string[];
  }) => Promise<GroupDetails>;
  createChannel: (data: {
    name: string;
    description?: string;
    avatarUrl?: string | null;
    isPublic?: boolean;
    memberIds?: string[];
  }) => Promise<GroupDetails>;
  browsePublicChannels: (query?: string) => Promise<void>;
  joinPublicChannel: (chatId: string) => Promise<void>;
  addMembersToGroup: (chatId: string, memberIds: string[]) => Promise<void>;
  removeMemberFromGroup: (chatId: string, targetUserId: string) => Promise<void>;
  updateMemberRoleInGroup: (
    chatId: string,
    targetUserId: string,
    role: 'admin' | 'moderator' | 'member',
  ) => Promise<void>;
  leaveGroup: (chatId: string) => Promise<void>;
  clearActiveGroupDetails: () => void;
}

export const useChatStore = create<ChatStoreState>((set, get) => ({
  chats: [],
  activeChatId: null,
  activeGroupDetails: null,
  publicChannels: [],
  messages: {},
  cursors: {},
  hasMore: {},
  isLoadingChats: false,
  isLoadingMessages: false,
  isLoadingGroupDetails: false,
  isBrowsingChannels: false,
  isSending: false,
  error: null,
  typingUsers: {},
  replyingTo: null,
  editingMessage: null,

  setReplyingTo: (msg: ChatMessage | null) => set({ replyingTo: msg, editingMessage: null }),
  setEditingMessage: (msg: ChatMessage | null) => set({ editingMessage: msg, replyingTo: null }),
  clearActiveGroupDetails: () => set({ activeGroupDetails: null }),

  fetchChats: async () => {
    set({ isLoadingChats: true, error: null });
    try {
      const res = await apiRequest<{ success: boolean; data: { chats: Chat[] } | Chat[] }>('/api/v1/chats');
      const rawChats = Array.isArray(res.data)
        ? res.data
        : (res.data && Array.isArray((res.data as any).chats))
        ? (res.data as any).chats
        : [];

      // Deduplicate direct chats so only ONE conversation per contact is kept
      const seenDirectUsers = new Set<string>();
      const chatsList: Chat[] = [];
      for (const chat of rawChats) {
        if (chat.type === 'direct' && chat.otherUser?.id) {
          if (seenDirectUsers.has(chat.otherUser.id)) continue;
          seenDirectUsers.add(chat.otherUser.id);
        }
        chatsList.push(chat);
      }

      set({ chats: chatsList, isLoadingChats: false });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to fetch chats';
      set({ error: msg, isLoadingChats: false });
    }
  },

  selectChat: async (chatId: string | null) => {
    const prevChatId = get().activeChatId;
    const socket = getSocket();

    if (prevChatId && prevChatId !== chatId && socket.connected) {
      socket.emit('chat:leave', prevChatId);
    }

    set({ activeChatId: chatId, activeGroupDetails: null });

    if (chatId) {
      if (socket.connected) {
        socket.emit('chat:join', chatId);
      }

      // Mark unread as 0 locally immediately and sync with server
      set((state) => ({
        chats: state.chats.map((c) => (c.id === chatId ? { ...c, unreadCount: 0 } : c)),
      }));
      void get().markChatAsRead(chatId);

      // Always fetch messages for selected chat
      void get().fetchMessages(chatId);

      // If group or channel, fetch details
      const selected = get().chats.find((c) => c.id === chatId);
      if (selected && (selected.type === 'group' || selected.type === 'channel')) {
        void get().fetchGroupDetails(chatId);
      }
    }
  },

  getOrCreateDirectChat: async (targetUserId: string): Promise<Chat> => {
    // 1. If a direct chat with this user already exists locally, select and return it immediately
    const existing = get().chats.find(
      (c) => c.type === 'direct' && c.otherUser?.id === targetUserId,
    );
    if (existing) {
      await get().selectChat(existing.id);
      return existing;
    }

    set({ error: null });
    try {
      const res = await apiRequest<{ success: boolean; data: { chat: Chat } | Chat }>('/api/v1/chats/direct', {
        method: 'POST',
        body: JSON.stringify({ targetUserId }),
      });
      const chat = (res.data && 'chat' in res.data) ? (res.data as any).chat : (res.data as Chat);

      set((state) => {
        // Filter out any chats with the same ID or same otherUser
        const filtered = state.chats.filter(
          (c) => c.id !== chat.id && !(c.type === 'direct' && c.otherUser?.id === chat.otherUser?.id),
        );
        return { chats: [chat, ...filtered] };
      });

      await get().selectChat(chat.id);
      return chat;
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to open direct chat';
      set({ error: msg });
      throw err;
    }
  },

  fetchGroupDetails: async (chatId: string): Promise<GroupDetails | null> => {
    set({ isLoadingGroupDetails: true, error: null });
    try {
      const res = await apiRequest<{ success: boolean; data: GroupDetails }>(
        `/api/v1/groups/${chatId}/details`,
      );
      set({ activeGroupDetails: res.data, isLoadingGroupDetails: false });
      return res.data;
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to fetch group details';
      set({ error: msg, isLoadingGroupDetails: false });
      return null;
    }
  },

  createGroup: async (data): Promise<GroupDetails> => {
    set({ error: null });
    try {
      const res = await apiRequest<{ success: boolean; data: GroupDetails }>('/api/v1/groups', {
        method: 'POST',
        body: JSON.stringify(data),
      });
      const details = res.data;
      void get().fetchChats();
      await get().selectChat(details.id);
      return details;
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to create group';
      set({ error: msg });
      throw err;
    }
  },

  createChannel: async (data): Promise<GroupDetails> => {
    set({ error: null });
    try {
      const res = await apiRequest<{ success: boolean; data: GroupDetails }>(
        '/api/v1/groups/channels',
        {
          method: 'POST',
          body: JSON.stringify(data),
        },
      );
      const details = res.data;
      void get().fetchChats();
      await get().selectChat(details.id);
      return details;
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to create channel';
      set({ error: msg });
      throw err;
    }
  },

  browsePublicChannels: async (queryStr?: string) => {
    set({ isBrowsingChannels: true, error: null });
    try {
      const queryParam = queryStr ? `?q=${encodeURIComponent(queryStr)}` : '';
      const res = await apiRequest<{ success: boolean; data: PublicChannel[] }>(
        `/api/v1/groups/channels/public${queryParam}`,
      );
      set({ publicChannels: res.data, isBrowsingChannels: false });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to browse channels';
      set({ error: msg, isBrowsingChannels: false });
    }
  },

  joinPublicChannel: async (chatId: string) => {
    set({ error: null });
    try {
      await apiRequest(`/api/v1/groups/channels/${chatId}/join`, {
        method: 'POST',
      });
      void get().fetchChats();
      await get().selectChat(chatId);
      set((state) => ({
        publicChannels: state.publicChannels.map((c) =>
          c.id === chatId ? { ...c, isJoined: true, memberCount: c.memberCount + 1 } : c,
        ),
      }));
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to join channel';
      set({ error: msg });
      throw err;
    }
  },

  addMembersToGroup: async (chatId: string, memberIds: string[]) => {
    set({ error: null });
    try {
      const res = await apiRequest<{ success: boolean; data: GroupDetails }>(
        `/api/v1/groups/${chatId}/members`,
        {
          method: 'POST',
          body: JSON.stringify({ memberIds }),
        },
      );
      set({ activeGroupDetails: res.data });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to add members';
      set({ error: msg });
      throw err;
    }
  },

  removeMemberFromGroup: async (chatId: string, targetUserId: string) => {
    set({ error: null });
    try {
      const res = await apiRequest<{ success: boolean; data: GroupDetails }>(
        `/api/v1/groups/${chatId}/members/${targetUserId}`,
        {
          method: 'DELETE',
        },
      );
      set({ activeGroupDetails: res.data });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to remove member';
      set({ error: msg });
      throw err;
    }
  },

  updateMemberRoleInGroup: async (
    chatId: string,
    targetUserId: string,
    role: 'admin' | 'moderator' | 'member',
  ) => {
    set({ error: null });
    try {
      const res = await apiRequest<{ success: boolean; data: GroupDetails }>(
        `/api/v1/groups/${chatId}/members/${targetUserId}/role`,
        {
          method: 'PATCH',
          body: JSON.stringify({ role }),
        },
      );
      set({ activeGroupDetails: res.data });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to update member role';
      set({ error: msg });
      throw err;
    }
  },

  leaveGroup: async (chatId: string) => {
    set({ error: null });
    try {
      await apiRequest(`/api/v1/groups/${chatId}/leave`, {
        method: 'POST',
      });
      set((state) => ({
        chats: state.chats.filter((c) => c.id !== chatId),
        activeChatId: state.activeChatId === chatId ? null : state.activeChatId,
        activeGroupDetails: null,
      }));
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to leave conversation';
      set({ error: msg });
      throw err;
    }
  },

  uploadMedia: async (file: File): Promise<MessageAttachment> => {
    set({ error: null });
    const formData = new FormData();
    formData.append('file', file);

    const token = getClientAccessToken();
    const res = await fetch(resolveApiUrl('/api/v1/media/upload'), {
      method: 'POST',
      headers: {
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: formData,
    });

    if (!res.ok) {
      const errorData = await res.json().catch(() => ({}));
      const msg = errorData?.error?.message || 'Media upload failed';
      set({ error: msg });
      throw new Error(msg);
    }

    const json = await res.json();
    return json.data as MessageAttachment;
  },

  fetchMessages: async (chatId: string, loadMore = false) => {
    const hasExisting = Boolean(get().messages[chatId] && get().messages[chatId].length > 0);
    if (!loadMore && !hasExisting) {
      set({ isLoadingMessages: true, error: null });
    }
    try {
      const cursor = loadMore ? get().cursors[chatId] : undefined;
      const queryParam = cursor ? `?cursor=${encodeURIComponent(cursor)}&limit=50` : '?limit=50';
      const res = await apiRequest<{
        success: boolean;
        data: { messages: ChatMessage[]; nextCursor: string | null };
      }>(`/api/v1/chats/${chatId}/messages${queryParam}`);

      const { messages: newMsgs, nextCursor } = res.data;

      set((state) => {
        const existing = state.messages[chatId] || [];
        const sendingOptimistic = existing.filter((m) => m.id.startsWith('optimistic-'));
        const combined = loadMore
          ? [...newMsgs, ...existing]
          : [...newMsgs, ...sendingOptimistic];
        const seen = new Set<string>();
        const deduplicated = combined.filter((m: ChatMessage) => {
          if (seen.has(m.id)) return false;
          seen.add(m.id);
          return true;
        });

        return {
          messages: { ...state.messages, [chatId]: deduplicated },
          cursors: { ...state.cursors, [chatId]: nextCursor },
          hasMore: { ...state.hasMore, [chatId]: Boolean(nextCursor) },
          isLoadingMessages: false,
        };
      });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to fetch messages';
      set({ error: msg, isLoadingMessages: false });
    }
  },

  sendMessage: async (
    chatId: string,
    content: string,
    replyToId?: string,
    attachments?: AttachmentInput[],
    type?: string,
  ): Promise<ChatMessage | null> => {
    if (!content.trim() && (!attachments || attachments.length === 0)) return null;
    const actualReplyToId = replyToId || get().replyingTo?.id;
    const replyingSnapshot = get().replyingTo;

    // Create optimistic message for instant UI render
    const currentUser = useAuthStore.getState().user;
    const tempId = `optimistic-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
    const optimisticMessage: ChatMessage = {
      id: tempId,
      chatId,
      senderId: currentUser?.id || 'me',
      type: type || (attachments && attachments.length > 0 ? 'media' : 'text'),
      content: content.trim(),
      replyToId: actualReplyToId || null,
      replyTo: replyingSnapshot,
      isEdited: false,
      status: 'sending',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      sender: {
        id: currentUser?.id || 'me',
        username: currentUser?.username || 'me',
        displayName: currentUser?.displayName || 'Me',
        avatarUrl: currentUser?.avatarUrl || null,
      },
      attachments: attachments?.map((a, i) => ({
        id: `temp-att-${i}`,
        messageId: tempId,
        fileName: a.fileName,
        fileSize: a.fileSize,
        mimeType: a.mimeType,
        storageKey: a.storageKey,
        publicUrl: `/api/v1/media/file/${a.storageKey}`,
      })),
    };

    // Optimistically push to chat messages and update chat's lastMessage
    set((state) => {
      const existing = state.messages[chatId] || [];
      const updatedChats = state.chats.map((c) =>
        c.id === chatId
          ? {
              ...c,
              lastMessage: {
                id: tempId,
                content: optimisticMessage.content,
                senderId: optimisticMessage.senderId,
                type: optimisticMessage.type,
                createdAt: optimisticMessage.createdAt,
              },
            }
          : c,
      );
      return {
        messages: {
          ...state.messages,
          [chatId]: [...existing, optimisticMessage],
        },
        chats: updatedChats,
        isSending: true,
        replyingTo: null,
        error: null,
      };
    });

    try {
      const res = await apiRequest<{ success: boolean; data: { message: ChatMessage } }>(
        `/api/v1/chats/${chatId}/messages`,
        {
          method: 'POST',
          body: JSON.stringify({
            content: content.trim(),
            replyToId: actualReplyToId,
            attachments,
            type,
          }),
        },
      );
      const serverMsg = res.data.message;

      // Replace optimistic message with confirmed server message
      set((state) => {
        const chatMsgs = state.messages[chatId] || [];
        const replaced = chatMsgs.map((m) => (m.id === tempId ? serverMsg : m));
        const updatedChats = state.chats.map((c) =>
          c.id === chatId
            ? {
                ...c,
                lastMessage: {
                  id: serverMsg.id,
                  content: serverMsg.content,
                  senderId: serverMsg.senderId,
                  type: serverMsg.type,
                  createdAt: serverMsg.createdAt,
                },
              }
            : c,
        );
        return {
          messages: {
            ...state.messages,
            [chatId]: replaced,
          },
          chats: updatedChats,
          isSending: false,
        };
      });

      return serverMsg;
    } catch (err: unknown) {
      const errorMsg = err instanceof Error ? err.message : 'Failed to send message';
      // Mark optimistic message as failed
      set((state) => {
        const chatMsgs = state.messages[chatId] || [];
        const updated = chatMsgs.map((m) => (m.id === tempId ? { ...m, status: 'failed' as const } : m));
        return {
          messages: {
            ...state.messages,
            [chatId]: updated,
          },
          isSending: false,
          error: errorMsg,
        };
      });
      throw err;
    }
  },

  markChatAsRead: async (chatId: string) => {
    try {
      await apiRequest(`/api/v1/chats/${chatId}/read`, { method: 'POST' });
      const socket = getSocket();
      if (socket.connected) {
        socket.emit('message:read', { chatId });
      }
      set((state) => ({
        chats: state.chats.map((c) => (c.id === chatId ? { ...c, unreadCount: 0 } : c)),
        messages: {
          ...state.messages,
          [chatId]: (state.messages[chatId] || []).map((m) => ({ ...m, status: 'read' })),
        },
      }));
    } catch {
      // Non-blocking for UI
    }
  },

  setTyping: (chatId: string, username: string, isTyping: boolean) => {
    set((state) => {
      const existing = state.typingUsers[chatId] || [];
      const updated = isTyping
        ? Array.from(new Set([...existing, username]))
        : existing.filter((u) => u !== username);

      return {
        typingUsers: { ...state.typingUsers, [chatId]: updated },
      };
    });
  },

  handleMessageStatusUpdated: (data: {
    chatId: string;
    userId: string;
    status: 'sent' | 'delivered' | 'read';
    messageIds?: string[];
  }) => {
    set((state) => {
      const chatMsgs = state.messages[data.chatId];
      if (!chatMsgs) return state;

      const updated = chatMsgs.map((m) => {
        if (!data.messageIds || data.messageIds.includes(m.id)) {
          return { ...m, status: data.status };
        }
        return m;
      });

      return {
        messages: { ...state.messages, [data.chatId]: updated },
      };
    });
  },

  toggleReaction: async (messageId: string, emoji: string) => {
    try {
      const res = await apiRequest<{
        success: boolean;
        data: {
          action: 'added' | 'removed';
          messageId: string;
          chatId: string;
          userId: string;
          emoji: string;
          reactions: MessageReaction[];
        };
      }>(`/api/v1/messages/${messageId}/reactions`, {
        method: 'POST',
        body: JSON.stringify({ emoji }),
      });

      get().handleReactionUpdated(res.data);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to toggle reaction';
      set({ error: msg });
    }
  },

  handleReactionUpdated: (data: {
    messageId: string;
    chatId: string;
    userId: string;
    emoji: string;
    action: 'added' | 'removed';
    reactions: MessageReaction[];
  }) => {
    set((state) => {
      const chatMsgs = state.messages[data.chatId];
      if (!chatMsgs) return state;

      const updated = chatMsgs.map((m) => {
        if (m.id === data.messageId) {
          return {
            ...m,
            reactions: data.reactions,
          };
        }
        return m;
      });

      return {
        messages: { ...state.messages, [data.chatId]: updated },
      };
    });
  },

  editMessage: async (messageId: string, content: string) => {
    set({ error: null });
    try {
      const res = await apiRequest<{ success: boolean; data: { message: ChatMessage } }>(
        `/api/v1/messages/${messageId}`,
        {
          method: 'PATCH',
          body: JSON.stringify({ content: content.trim() }),
        },
      );
      get().handleMessageUpdated(res.data.message);
      set({ editingMessage: null });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to edit message';
      set({ error: msg });
      throw err;
    }
  },

  deleteMessage: async (messageId: string, mode: 'me' | 'everyone' = 'everyone') => {
    set({ error: null });
    try {
      const res = await apiRequest<{
        success: boolean;
        data: { messageId: string; chatId: string; deleteType: 'me' | 'everyone' };
      }>(`/api/v1/messages/${messageId}?mode=${mode}`, {
        method: 'DELETE',
      });
      get().handleMessageDeleted(res.data);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to delete message';
      set({ error: msg });
      throw err;
    }
  },

  handleMessageUpdated: (updatedMsg: ChatMessage) => {
    set((state) => {
      const chatMsgs = state.messages[updatedMsg.chatId];
      if (!chatMsgs) return state;

      const updated = chatMsgs.map((m) => (m.id === updatedMsg.id ? { ...m, ...updatedMsg } : m));
      return {
        messages: { ...state.messages, [updatedMsg.chatId]: updated },
      };
    });
  },

  handleMessageDeleted: (data: { messageId: string; chatId: string; deleteType: 'me' | 'everyone' }) => {
    set((state) => {
      const chatMsgs = state.messages[data.chatId];
      if (!chatMsgs) return state;

      const filtered = chatMsgs.filter((m) => m.id !== data.messageId);
      return {
        messages: { ...state.messages, [data.chatId]: filtered },
      };
    });
  },

  handleIncomingMessage: (msg: ChatMessage) => {
    const { activeChatId } = get();

    // Acknowledge delivery
    const socket = getSocket();
    if (socket.connected) {
      socket.emit('message:delivered', { chatId: msg.chatId, messageIds: [msg.id] });
    }

    // If currently viewing this chat, automatically mark as read
    if (activeChatId === msg.chatId) {
      void get().markChatAsRead(msg.chatId);
    }

    set((state) => {
      const chatMessages = state.messages[msg.chatId] || [];
      if (chatMessages.some((m: ChatMessage) => m.id === msg.id)) {
        return state;
      }

      const updatedMessages = [...chatMessages, msg];

      const targetChat = state.chats.find((c) => c.id === msg.chatId);
      const otherChats = state.chats.filter((c) => c.id !== msg.chatId);

      const updatedChat: Chat = targetChat
        ? {
            ...targetChat,
            lastMessage: {
              id: msg.id,
              content: msg.content,
              senderId: msg.senderId,
              type: msg.type,
              createdAt: msg.createdAt,
            },
            unreadCount: activeChatId === msg.chatId ? 0 : targetChat.unreadCount + 1,
            updatedAt: msg.createdAt,
          }
        : {
            id: msg.chatId,
            type: 'direct',
            name: msg.sender.displayName,
            avatarUrl: msg.sender.avatarUrl,
            createdAt: msg.createdAt,
            updatedAt: msg.createdAt,
            lastMessage: {
              id: msg.id,
              content: msg.content,
              senderId: msg.senderId,
              type: msg.type,
              createdAt: msg.createdAt,
            },
            unreadCount: activeChatId === msg.chatId ? 0 : 1,
          };

      return {
        messages: {
          ...state.messages,
          [msg.chatId]: updatedMessages,
        },
        chats: [updatedChat, ...otherChats],
      };
    });
  },

  setupSocketListeners: () => {
    const socket = getSocket();

    const onNewMessage = (msg: ChatMessage) => {
      get().handleIncomingMessage(msg);
    };

    const onChatActivity = () => {
      void get().fetchChats();
    };

    const onTypingUpdate = (data: { chatId: string; username: string; isTyping: boolean }) => {
      get().setTyping(data.chatId, data.username, data.isTyping);
    };

    const onStatusUpdated = (data: {
      chatId: string;
      userId: string;
      status: 'sent' | 'delivered' | 'read';
      messageIds?: string[];
    }) => {
      get().handleMessageStatusUpdated(data);
    };

    const onUnreadReset = (data: { chatId: string }) => {
      set((state) => ({
        chats: state.chats.map((c) => (c.id === data.chatId ? { ...c, unreadCount: 0 } : c)),
      }));
    };

    const onMemberJoined = (data: { chatId: string }) => {
      if (get().activeChatId === data.chatId) {
        void get().fetchGroupDetails(data.chatId);
      }
      void get().fetchChats();
    };

    const onMemberLeft = (data: { chatId: string }) => {
      if (get().activeChatId === data.chatId) {
        void get().fetchGroupDetails(data.chatId);
      }
      void get().fetchChats();
    };

    const onRoleChanged = (data: { chatId: string }) => {
      if (get().activeChatId === data.chatId) {
        void get().fetchGroupDetails(data.chatId);
      }
    };

    const onGroupRemoved = (data: { chatId: string }) => {
      if (get().activeChatId === data.chatId) {
        set({ activeChatId: null, activeGroupDetails: null });
      }
      void get().fetchChats();
    };

    const onReactionUpdated = (data: {
      messageId: string;
      chatId: string;
      userId: string;
      emoji: string;
      action: 'added' | 'removed';
      reactions: MessageReaction[];
    }) => {
      get().handleReactionUpdated(data);
    };

    const onMessageUpdated = (updatedMsg: ChatMessage) => {
      get().handleMessageUpdated(updatedMsg);
    };

    const onMessageDeleted = (data: { messageId: string; chatId: string; deleteType: 'me' | 'everyone' }) => {
      get().handleMessageDeleted(data);
    };

    socket.on('message:new', onNewMessage);
    socket.on('chat:activity', onChatActivity);
    socket.on('typing:update', onTypingUpdate);
    socket.on('message:status_updated', onStatusUpdated);
    socket.on('message:reaction_updated', onReactionUpdated);
    socket.on('message:updated', onMessageUpdated);
    socket.on('message:deleted', onMessageDeleted);
    socket.on('chat:unread_reset', onUnreadReset);
    socket.on('group:member_joined', onMemberJoined);
    socket.on('group:member_left', onMemberLeft);
    socket.on('group:role_changed', onRoleChanged);
    socket.on('group:removed', onGroupRemoved);

    const onConnect = () => {
      const { activeChatId } = get();
      if (activeChatId) {
        socket.emit('chat:join', activeChatId);
      }
    };
    socket.on('connect', onConnect);

    return () => {
      socket.off('message:new', onNewMessage);
      socket.off('chat:activity', onChatActivity);
      socket.off('typing:update', onTypingUpdate);
      socket.off('message:status_updated', onStatusUpdated);
      socket.off('message:reaction_updated', onReactionUpdated);
      socket.off('message:updated', onMessageUpdated);
      socket.off('message:deleted', onMessageDeleted);
      socket.off('chat:unread_reset', onUnreadReset);
      socket.off('group:member_joined', onMemberJoined);
      socket.off('group:member_left', onMemberLeft);
      socket.off('group:role_changed', onRoleChanged);
      socket.off('group:removed', onGroupRemoved);
      socket.off('connect', onConnect);
    };
  },
}));
