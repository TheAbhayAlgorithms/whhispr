export type ChatMemberRole = 'owner' | 'admin' | 'moderator' | 'member';

export interface MessageSender {
  id: string;
  username: string;
  displayName: string;
  avatarUrl: string | null;
}

export interface MessageAttachment {
  id: string;
  messageId: string;
  fileName: string;
  fileSize: number;
  mimeType: string;
  storageKey: string;
  publicUrl: string;
  width?: number | null;
  height?: number | null;
  duration?: number | null;
  createdAt?: string;
}

export interface ReactionUser {
  id: string;
  username: string;
  displayName: string;
}

export interface MessageReaction {
  emoji: string;
  count: number;
  users: ReactionUser[];
  hasReacted: boolean;
}

export interface ReplyToMessage {
  id: string;
  content: string;
  type: string;
  sender: {
    id: string;
    username: string;
    displayName: string;
  };
}

export interface ChatMessage {
  id: string;
  chatId: string;
  senderId: string;
  type: string;
  content: string;
  replyToId: string | null;
  replyTo?: ReplyToMessage | null;
  isEdited: boolean;
  editedAt?: string | null;
  status?: 'sending' | 'sent' | 'delivered' | 'read' | 'failed';
  createdAt: string;
  updatedAt: string;
  sender: MessageSender;
  attachments?: MessageAttachment[];
  reactions?: MessageReaction[];
}

export interface TypingUpdate {
  chatId: string;
  userId: string;
  username: string;
  isTyping: boolean;
}

export interface ChatParticipant {
  id: string;
  username: string;
  displayName: string;
  avatarUrl: string | null;
  statusMessage?: string | null;
  lastSeen?: string | null;
}

export interface LastMessageSnippet {
  id: string;
  content: string | null;
  senderId: string | null;
  type: string;
  createdAt: string;
}

export interface Chat {
  id: string;
  type: 'direct' | 'group' | 'channel';
  name: string | null;
  avatarUrl: string | null;
  description?: string | null;
  isPublic?: boolean;
  createdAt: string;
  updatedAt: string;
  otherUser?: ChatParticipant;
  lastMessage: LastMessageSnippet | null;
  unreadCount: number;
}

export interface GroupMember {
  id: string;
  userId: string;
  role: ChatMemberRole;
  joinedAt: string;
  username: string;
  displayName: string;
  avatarUrl: string | null;
  statusMessage: string | null;
  lastSeen: string | null;
}

export interface GroupDetails {
  id: string;
  type: 'group' | 'channel';
  name: string;
  description: string | null;
  avatarUrl: string | null;
  isPublic: boolean;
  createdBy: string | null;
  createdAt: string;
  updatedAt: string;
  callerRole: ChatMemberRole | null;
  membersCount: number;
  members: GroupMember[];
}

export interface PublicChannel {
  id: string;
  name: string;
  description: string | null;
  avatarUrl: string | null;
  createdAt: string;
  memberCount: number;
  isJoined: boolean;
}
