import { describe, it, expect, beforeEach } from 'vitest';
import { useChatStore } from '../store/useChatStore';
import { Chat, ChatMessage, GroupDetails, PublicChannel } from '../types/chat';

describe('useChatStore', () => {
  beforeEach(() => {
    useChatStore.setState({
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
    });
  });

  it('initializes with empty default state', () => {
    const state = useChatStore.getState();
    expect(state.chats).toEqual([]);
    expect(state.activeChatId).toBeNull();
    expect(state.activeGroupDetails).toBeNull();
    expect(state.publicChannels).toEqual([]);
    expect(state.messages).toEqual({});
    expect(state.isLoadingChats).toBe(false);
  });

  it('sets active chat and resets unread count for that chat', async () => {
    const mockChat: Chat = {
      id: 'chat-1',
      type: 'direct',
      name: 'Alice',
      avatarUrl: null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      lastMessage: null,
      unreadCount: 3,
    };

    useChatStore.setState({ chats: [mockChat], activeChatId: null });
    expect(useChatStore.getState().chats[0].unreadCount).toBe(3);

    await useChatStore.getState().selectChat('chat-1');

    expect(useChatStore.getState().activeChatId).toBe('chat-1');
    expect(useChatStore.getState().chats[0].unreadCount).toBe(0);
  });

  it('handles incoming message: appends, deduplicates, and updates chat snippet', () => {
    const initialChat: Chat = {
      id: 'chat-1',
      type: 'direct',
      name: 'Bob',
      avatarUrl: null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      lastMessage: null,
      unreadCount: 0,
    };

    useChatStore.setState({
      chats: [initialChat],
      activeChatId: 'other-chat',
      messages: {},
    });

    const msg1: ChatMessage = {
      id: 'msg-1',
      chatId: 'chat-1',
      senderId: 'user-bob',
      type: 'text',
      content: 'Hello from Bob!',
      replyToId: null,
      isEdited: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      sender: {
        id: 'user-bob',
        username: 'bob',
        displayName: 'Bob',
        avatarUrl: null,
      },
    };

    // 1. Receive msg1
    useChatStore.getState().handleIncomingMessage(msg1);

    const state1 = useChatStore.getState();
    expect(state1.messages['chat-1']).toHaveLength(1);
    expect(state1.messages['chat-1'][0].content).toBe('Hello from Bob!');
    expect(state1.chats[0].lastMessage?.content).toBe('Hello from Bob!');
    expect(state1.chats[0].unreadCount).toBe(1);

    // 2. Duplicate msg1 should be ignored
    useChatStore.getState().handleIncomingMessage(msg1);
    expect(useChatStore.getState().messages['chat-1']).toHaveLength(1);

    // 3. Second message when activeChatId == chat-1
    useChatStore.setState({ activeChatId: 'chat-1' });
    const msg2: ChatMessage = {
      id: 'msg-2',
      chatId: 'chat-1',
      senderId: 'user-bob',
      type: 'text',
      content: 'Second message!',
      replyToId: null,
      isEdited: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      sender: {
        id: 'user-bob',
        username: 'bob',
        displayName: 'Bob',
        avatarUrl: null,
      },
    };

    useChatStore.getState().handleIncomingMessage(msg2);

    const state2 = useChatStore.getState();
    expect(state2.messages['chat-1']).toHaveLength(2);
    expect(state2.messages['chat-1'][1].content).toBe('Second message!');
    expect(state2.chats[0].unreadCount).toBe(0);
  });

  it('manages group details and public channel items in store', () => {
    const mockGroupDetails: GroupDetails = {
      id: 'grp-1',
      type: 'group',
      name: 'Frontend Guild',
      description: 'Discussing React and UI',
      avatarUrl: null,
      isPublic: false,
      createdBy: 'u1',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      callerRole: 'owner',
      membersCount: 2,
      members: [
        {
          id: 'cm-1',
          userId: 'u1',
          role: 'owner',
          joinedAt: new Date().toISOString(),
          username: 'alice',
          displayName: 'Alice',
          avatarUrl: null,
          statusMessage: null,
          lastSeen: null,
        },
      ],
    };

    const mockChannel: PublicChannel = {
      id: 'chan-1',
      name: 'announcements',
      description: 'Public channel',
      avatarUrl: null,
      createdAt: new Date().toISOString(),
      memberCount: 5,
      isJoined: false,
    };

    useChatStore.setState({
      activeGroupDetails: mockGroupDetails,
      publicChannels: [mockChannel],
    });

    expect(useChatStore.getState().activeGroupDetails?.name).toBe('Frontend Guild');
    expect(useChatStore.getState().activeGroupDetails?.callerRole).toBe('owner');
    expect(useChatStore.getState().publicChannels[0].name).toBe('announcements');

    useChatStore.getState().clearActiveGroupDetails();
    expect(useChatStore.getState().activeGroupDetails).toBeNull();
  });

  it('handles incoming messages with attachments correctly', () => {
    const msgWithMedia: ChatMessage = {
      id: 'msg-media-1',
      chatId: 'chat-1',
      senderId: 'user-alice',
      type: 'image',
      content: 'Check this screenshot',
      replyToId: null,
      isEdited: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      sender: {
        id: 'user-alice',
        username: 'alice',
        displayName: 'Alice',
        avatarUrl: null,
      },
      attachments: [
        {
          id: 'att-1',
          messageId: 'msg-media-1',
          storageKey: 'media/screenshot.png',
          publicUrl: '/api/v1/media/stream/media/screenshot.png',
          fileName: 'screenshot.png',
          fileSize: 1048576,
          mimeType: 'image/png',
          width: 1920,
          height: 1080,
          duration: null,
        },
      ],
    };

    useChatStore.getState().handleIncomingMessage(msgWithMedia);

    const msgs = useChatStore.getState().messages['chat-1'];
    expect(msgs).toHaveLength(1);
    expect(msgs[0].attachments).toBeDefined();
    expect(msgs[0].attachments?.[0].fileName).toBe('screenshot.png');
    expect(msgs[0].attachments?.[0].fileSize).toBe(1048576);
  });

  it('tracks typing indicators in store with setTyping', () => {
    expect(useChatStore.getState().typingUsers).toEqual({});

    // Alice starts typing in chat-1
    useChatStore.getState().setTyping('chat-1', 'alice', true);
    expect(useChatStore.getState().typingUsers['chat-1']).toEqual(['alice']);

    // Bob starts typing in chat-1
    useChatStore.getState().setTyping('chat-1', 'bob', true);
    expect(useChatStore.getState().typingUsers['chat-1']).toEqual(['alice', 'bob']);

    // Alice stops typing
    useChatStore.getState().setTyping('chat-1', 'alice', false);
    expect(useChatStore.getState().typingUsers['chat-1']).toEqual(['bob']);

    // Bob stops typing
    useChatStore.getState().setTyping('chat-1', 'bob', false);
    expect(useChatStore.getState().typingUsers['chat-1']).toEqual([]);
  });

  it('updates message status with handleMessageStatusUpdated', () => {
    const initialMessage: ChatMessage = {
      id: 'msg-101',
      chatId: 'chat-1',
      senderId: 'user-me',
      type: 'text',
      content: 'Hey there',
      replyToId: null,
      isEdited: false,
      status: 'sent',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      sender: {
        id: 'user-me',
        username: 'me',
        displayName: 'Me',
        avatarUrl: null,
      },
    };

    useChatStore.setState({
      messages: { 'chat-1': [initialMessage] },
    });

    expect(useChatStore.getState().messages['chat-1'][0].status).toBe('sent');

    // Delivery receipt
    useChatStore.getState().handleMessageStatusUpdated({
      chatId: 'chat-1',
      userId: 'user-other',
      status: 'delivered',
      messageIds: ['msg-101'],
    });

    expect(useChatStore.getState().messages['chat-1'][0].status).toBe('delivered');

    // Read receipt
    useChatStore.getState().handleMessageStatusUpdated({
      chatId: 'chat-1',
      userId: 'user-other',
      status: 'read',
      messageIds: ['msg-101'],
    });

    expect(useChatStore.getState().messages['chat-1'][0].status).toBe('read');
  });

  it('updates message reactions with handleReactionUpdated', () => {
    const initialMessage: ChatMessage = {
      id: 'msg-react-1',
      chatId: 'chat-1',
      senderId: 'user-alice',
      type: 'text',
      content: 'Antigravity rocks!',
      replyToId: null,
      isEdited: false,
      reactions: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      sender: {
        id: 'user-alice',
        username: 'alice',
        displayName: 'Alice',
        avatarUrl: null,
      },
    };

    useChatStore.setState({
      messages: { 'chat-1': [initialMessage] },
    });

    useChatStore.getState().handleReactionUpdated({
      messageId: 'msg-react-1',
      chatId: 'chat-1',
      userId: 'user-bob',
      emoji: '🔥',
      action: 'added',
      reactions: [
        {
          emoji: '🔥',
          count: 1,
          hasReacted: true,
          users: [{ id: 'user-bob', username: 'bob', displayName: 'Bob' }],
        },
      ],
    });

    const updated = useChatStore.getState().messages['chat-1'][0];
    expect(updated.reactions).toHaveLength(1);
    expect(updated.reactions?.[0].emoji).toBe('🔥');
    expect(updated.reactions?.[0].count).toBe(1);
    expect(updated.reactions?.[0].hasReacted).toBe(true);
    expect(updated.reactions?.[0].users[0].username).toBe('bob');
  });

  it('updates message in store with handleMessageUpdated', () => {
    const initialMessage: ChatMessage = {
      id: 'msg-edit-1',
      chatId: 'chat-1',
      senderId: 'user-alice',
      type: 'text',
      content: 'Original message',
      replyToId: null,
      isEdited: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      sender: {
        id: 'user-alice',
        username: 'alice',
        displayName: 'Alice',
        avatarUrl: null,
      },
    };

    useChatStore.setState({
      messages: { 'chat-1': [initialMessage] },
    });

    const updatedMsg: ChatMessage = {
      ...initialMessage,
      content: 'Updated content',
      isEdited: true,
      editedAt: new Date().toISOString(),
    };

    useChatStore.getState().handleMessageUpdated(updatedMsg);

    const result = useChatStore.getState().messages['chat-1'][0];
    expect(result.content).toBe('Updated content');
    expect(result.isEdited).toBe(true);
    expect(result.editedAt).toBeDefined();
  });

  it('removes message from store with handleMessageDeleted', () => {
    const msg1: ChatMessage = {
      id: 'msg-del-1',
      chatId: 'chat-1',
      senderId: 'user-alice',
      type: 'text',
      content: 'Will be deleted',
      replyToId: null,
      isEdited: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      sender: { id: 'user-alice', username: 'alice', displayName: 'Alice', avatarUrl: null },
    };
    const msg2: ChatMessage = {
      id: 'msg-del-2',
      chatId: 'chat-1',
      senderId: 'user-bob',
      type: 'text',
      content: 'Will stay',
      replyToId: null,
      isEdited: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      sender: { id: 'user-bob', username: 'bob', displayName: 'Bob', avatarUrl: null },
    };

    useChatStore.setState({
      messages: { 'chat-1': [msg1, msg2] },
    });

    useChatStore.getState().handleMessageDeleted({
      messageId: 'msg-del-1',
      chatId: 'chat-1',
      deleteType: 'everyone',
    });

    const currentMsgs = useChatStore.getState().messages['chat-1'];
    expect(currentMsgs).toHaveLength(1);
    expect(currentMsgs[0].id).toBe('msg-del-2');
  });

  it('manages replyingTo and editingMessage state and mutual exclusion', () => {
    const testMsg: ChatMessage = {
      id: 'msg-state-1',
      chatId: 'chat-1',
      senderId: 'user-alice',
      type: 'text',
      content: 'Test message',
      replyToId: null,
      isEdited: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      sender: { id: 'user-alice', username: 'alice', displayName: 'Alice', avatarUrl: null },
    };

    expect(useChatStore.getState().replyingTo).toBeNull();
    expect(useChatStore.getState().editingMessage).toBeNull();

    useChatStore.getState().setReplyingTo(testMsg);
    expect(useChatStore.getState().replyingTo?.id).toBe('msg-state-1');
    expect(useChatStore.getState().editingMessage).toBeNull();

    useChatStore.getState().setEditingMessage(testMsg);
    expect(useChatStore.getState().editingMessage?.id).toBe('msg-state-1');
    expect(useChatStore.getState().replyingTo).toBeNull();

    useChatStore.getState().setEditingMessage(null);
    expect(useChatStore.getState().editingMessage).toBeNull();
  });
});


