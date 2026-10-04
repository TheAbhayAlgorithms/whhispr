export interface SearchMessageResult {
  id: string;
  chatId: string;
  chatName: string | null;
  chatType: 'direct' | 'group' | 'channel';
  senderId: string;
  senderUsername: string;
  senderDisplayName: string;
  senderAvatarUrl: string | null;
  type: string;
  content: string;
  headline: string;
  replyToId: string | null;
  isEdited: boolean;
  createdAt: string;
  attachments: Array<{
    id: string;
    fileName: string;
    fileSize: number;
    mimeType: string;
    storageKey: string;
    publicUrl: string;
  }>;
}

export interface SearchUserResult {
  userId: string;
  username: string;
  displayName: string;
  avatarUrl: string | null;
  bio: string | null;
  statusMessage: string | null;
  isContact?: boolean;
}

export interface SearchChatResult {
  id: string;
  type: 'direct' | 'group' | 'channel';
  name: string;
  description: string | null;
  avatarUrl: string | null;
  isMember: boolean;
  isPublic: boolean;
  memberCount: number;
  updatedAt: string;
}

export interface UnifiedSearchResult {
  messages: SearchMessageResult[];
  users: SearchUserResult[];
  chats: SearchChatResult[];
}
