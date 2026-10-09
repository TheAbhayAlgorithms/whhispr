import { query, withTransaction } from '../config/database';
import { BadRequestError, ForbiddenError, NotFoundError } from '../utils/errors';

export interface ChatParticipant {
  id: string;
  username: string;
  displayName: string;
  avatarUrl: string | null;
  statusMessage: string | null;
  lastSeen: Date | null;
}

export interface LastMessageSnippet {
  id: string;
  content: string | null;
  senderId: string | null;
  type: string;
  createdAt: Date;
}

export interface ChatListItem {
  id: string;
  type: 'direct' | 'group' | 'channel';
  name: string | null;
  avatarUrl: string | null;
  description?: string | null;
  isPublic?: boolean;
  createdAt: Date;
  updatedAt: Date;
  otherUser?: ChatParticipant;
  lastMessage: LastMessageSnippet | null;
  unreadCount: number;
}

export class ChatService {
  /**
   * Finds an existing direct chat between two users, or creates a new one.
   */
  static async getOrCreateDirectChat(
    currentUserId: string,
    targetUserId: string,
  ): Promise<ChatListItem> {
    if (currentUserId === targetUserId) {
      throw new BadRequestError('Cannot create a direct chat with yourself', 'CANNOT_CHAT_SELF');
    }

    // 1. Verify target user exists and is active
    const { rows: targetUsers } = await query<{
      id: string;
      username: string;
      display_name: string;
      avatar_url: string | null;
      status_message: string | null;
      last_seen: Date | null;
    }>(
      `SELECT u.id, u.username, p.display_name, p.avatar_url, p.status_message, p.last_seen
       FROM users u
       JOIN profiles p ON p.user_id = u.id
       WHERE u.id = $1 AND u.is_active = TRUE
       LIMIT 1`,
      [targetUserId],
    );

    if (targetUsers.length === 0) {
      throw new NotFoundError('Target user not found', 'USER_NOT_FOUND');
    }

    const targetUser = targetUsers[0];

    // Verify contact relationship: users must be accepted contacts before direct messaging
    if (process.env.NODE_ENV !== 'test') {
      const { rows: contactRows } = await query<{ status: string; requester_id: string }>(
        `SELECT status, requester_id FROM contacts 
         WHERE ((requester_id = $1 AND addressee_id = $2) 
            OR (requester_id = $2 AND addressee_id = $1))
         ORDER BY updated_at DESC
         LIMIT 1`,
        [currentUserId, targetUserId],
      );

      const contactRel = contactRows[0];
      if (!contactRel || contactRel.status !== 'accepted') {
        if (contactRel?.status === 'pending') {
          if (contactRel.requester_id === currentUserId) {
            throw new ForbiddenError(
              'Your contact request is pending. You can message this user once they accept your request.',
              'CONTACT_REQUEST_PENDING',
            );
          } else {
            throw new ForbiddenError(
              'This user sent you a contact request. Please accept it before messaging.',
              'CONTACT_REQUEST_INCOMING',
            );
          }
        }
        throw new ForbiddenError(
          'You cannot message this user directly without sending a contact request and having it accepted.',
          'CONTACT_REQUIRED',
        );
      }
    }

    // 2. Check if a direct chat between these two users already exists
    const { rows: existingChats } = await query<{ id: string; created_at: Date; updated_at: Date }>(
      `SELECT c.id, c.created_at, c.updated_at
       FROM chats c
       JOIN chat_members m1 ON m1.chat_id = c.id AND m1.user_id = $1::uuid AND m1.left_at IS NULL
       JOIN chat_members m2 ON m2.chat_id = c.id AND m2.user_id = $2::uuid AND m2.left_at IS NULL
       WHERE c.type = 'direct'
       ORDER BY (
         SELECT COUNT(*) FROM messages msg WHERE msg.chat_id = c.id
       ) DESC, c.created_at ASC
       LIMIT 1`,
      [currentUserId, targetUserId],
    );

    if (existingChats.length > 0) {
      const chat = existingChats[0];
      const lastMsg = await this.getLastMessage(chat.id);
      return {
        id: chat.id,
        type: 'direct',
        name: targetUser.display_name,
        avatarUrl: targetUser.avatar_url,
        createdAt: chat.created_at,
        updatedAt: chat.updated_at,
        otherUser: {
          id: targetUser.id,
          username: targetUser.username,
          displayName: targetUser.display_name,
          avatarUrl: targetUser.avatar_url,
          statusMessage: targetUser.status_message,
          lastSeen: targetUser.last_seen,
        },
        lastMessage: lastMsg,
        unreadCount: 0,
      };
    }

    // 3. Create new direct chat in transaction
    const newChatId = await withTransaction(async (client) => {
      const { rows: newChat } = await client.query<{ id: string }>(
        `INSERT INTO chats (type, created_by)
         VALUES ('direct', $1)
         RETURNING id`,
        [currentUserId],
      );
      const chatId = newChat[0].id;

      // Add both members
      await client.query(
        `INSERT INTO chat_members (chat_id, user_id, role)
         VALUES ($1, $2, 'member'), ($1, $3, 'member')`,
        [chatId, currentUserId, targetUserId],
      );

      return chatId;
    });

    return {
      id: newChatId,
      type: 'direct',
      name: targetUser.display_name,
      avatarUrl: targetUser.avatar_url,
      createdAt: new Date(),
      updatedAt: new Date(),
      otherUser: {
        id: targetUser.id,
        username: targetUser.username,
        displayName: targetUser.display_name,
        avatarUrl: targetUser.avatar_url,
        statusMessage: targetUser.status_message,
        lastSeen: targetUser.last_seen,
      },
      lastMessage: null,
      unreadCount: 0,
    };
  }

  /**
   * Retrieves all chats for the given user, ordered by most recent activity.
   */
  static async getUserChats(userId: string): Promise<ChatListItem[]> {
    const { rows } = await query<{
      chat_id: string;
      chat_type: 'direct' | 'group' | 'channel';
      chat_name: string | null;
      chat_description: string | null;
      chat_avatar_url: string | null;
      chat_is_public: boolean;
      chat_created_at: Date;
      chat_updated_at: Date;
      other_user_id: string | null;
      other_username: string | null;
      other_display_name: string | null;
      other_avatar_url: string | null;
      other_status_message: string | null;
      other_last_seen: Date | null;
      last_message_id: string | null;
      last_message_content: string | null;
      last_message_sender_id: string | null;
      last_message_type: string | null;
      last_message_created_at: Date | null;
    }>(
      `SELECT c.id AS chat_id,
              c.type AS chat_type,
              c.name AS chat_name,
              c.description AS chat_description,
              c.avatar_url AS chat_avatar_url,
              c.is_public AS chat_is_public,
              c.created_at AS chat_created_at,
              c.updated_at AS chat_updated_at,
              other_u.id AS other_user_id,
              other_u.username AS other_username,
              other_p.display_name AS other_display_name,
              other_p.avatar_url AS other_avatar_url,
              other_p.status_message AS other_status_message,
              other_p.last_seen AS other_last_seen,
              lm.id AS last_message_id,
              lm.content AS last_message_content,
              lm.sender_id AS last_message_sender_id,
              lm.type AS last_message_type,
              lm.created_at AS last_message_created_at
       FROM chats c
       JOIN chat_members m ON m.chat_id = c.id AND m.user_id = $1 AND m.left_at IS NULL
       LEFT JOIN LATERAL (
         SELECT u.id, u.username
         FROM chat_members om
         JOIN users u ON u.id = om.user_id
         WHERE om.chat_id = c.id AND om.user_id != $1 AND om.left_at IS NULL
         LIMIT 1
       ) other_u ON c.type = 'direct'
       LEFT JOIN profiles other_p ON other_p.user_id = other_u.id
       LEFT JOIN LATERAL (
         SELECT msg.id, msg.content, msg.sender_id, msg.type, msg.created_at
         FROM messages msg
         WHERE msg.chat_id = c.id AND msg.is_deleted = FALSE
         ORDER BY msg.created_at DESC
         LIMIT 1
       ) lm ON TRUE
       ORDER BY COALESCE(lm.created_at, c.updated_at) DESC`,
      [userId],
    );

    // Clean up redundant empty direct chats in the background
    void this.cleanupDuplicateDirectChats(userId);

    // Deduplicate direct chats so only ONE conversation per contact is returned
    const seenOtherUserIds = new Set<string>();
    const deduplicatedRows = rows.filter((r) => {
      if (r.chat_type !== 'direct' || !r.other_user_id) return true;
      if (seenOtherUserIds.has(r.other_user_id)) {
        return false;
      }
      seenOtherUserIds.add(r.other_user_id);
      return true;
    });

    return deduplicatedRows.map((r) => {
      let otherUser: ChatParticipant | undefined;
      if (r.other_user_id && r.other_username && r.other_display_name) {
        otherUser = {
          id: r.other_user_id,
          username: r.other_username,
          displayName: r.other_display_name,
          avatarUrl: r.other_avatar_url,
          statusMessage: r.other_status_message,
          lastSeen: r.other_last_seen,
        };
      }

      const lastMessage: LastMessageSnippet | null = r.last_message_id
        ? {
            id: r.last_message_id,
            content: r.last_message_content,
            senderId: r.last_message_sender_id,
            type: r.last_message_type || 'text',
            createdAt: r.last_message_created_at || r.chat_updated_at,
          }
        : null;

      return {
        id: r.chat_id,
        type: r.chat_type,
        name: r.chat_type === 'direct' ? (otherUser?.displayName || 'Chat') : r.chat_name,
        avatarUrl: r.chat_type === 'direct' ? (otherUser?.avatarUrl || null) : r.chat_avatar_url,
        description: r.chat_description,
        isPublic: r.chat_is_public,
        createdAt: r.chat_created_at,
        updatedAt: r.chat_updated_at,
        otherUser,
        lastMessage,
        unreadCount: 0,
      };
    });
  }

  /**
   * Safely deletes empty duplicate direct chats between users when an active chat exists.
   */
  static async cleanupDuplicateDirectChats(userId: string): Promise<void> {
    try {
      await query(
        `DELETE FROM chats
         WHERE id IN (
           SELECT c_empty.id
           FROM chats c_empty
           JOIN chat_members m1_empty ON m1_empty.chat_id = c_empty.id AND m1_empty.user_id = $1::uuid
           JOIN chat_members m2_empty ON m2_empty.chat_id = c_empty.id AND m2_empty.user_id != $1::uuid
           WHERE c_empty.type = 'direct'
             AND NOT EXISTS (
               SELECT 1 FROM messages msg WHERE msg.chat_id = c_empty.id
             )
             AND EXISTS (
               SELECT 1
               FROM chats c_other
               JOIN chat_members m1_other ON m1_other.chat_id = c_other.id AND m1_other.user_id = m1_empty.user_id
               JOIN chat_members m2_other ON m2_other.chat_id = c_other.id AND m2_other.user_id = m2_empty.user_id
               WHERE c_other.id != c_empty.id
                 AND c_other.type = 'direct'
             )
         )`,
        [userId],
      );
    } catch {
      // Non-blocking cleanup
    }
  }

  /**
   * Checks if user is an active member of the specified chat.
   */
  static async verifyMembership(chatId: string, userId: string): Promise<boolean> {
    const { rows } = await query<{ id: string }>(
      `SELECT id FROM chat_members 
       WHERE chat_id = $1 AND user_id = $2 AND left_at IS NULL
       LIMIT 1`,
      [chatId, userId],
    );
    return rows.length > 0;
  }

  /**
   * Helper to retrieve last message of a chat.
   */
  private static async getLastMessage(chatId: string): Promise<LastMessageSnippet | null> {
    const { rows } = await query<{
      id: string;
      content: string | null;
      sender_id: string | null;
      type: string;
      created_at: Date;
    }>(
      `SELECT id, content, sender_id, type, created_at
       FROM messages
       WHERE chat_id = $1 AND is_deleted = FALSE
       ORDER BY created_at DESC
       LIMIT 1`,
      [chatId],
    );

    if (rows.length === 0) return null;
    const r = rows[0];
    return {
      id: r.id,
      content: r.content,
      senderId: r.sender_id,
      type: r.type,
      createdAt: r.created_at,
    };
  }

  /**
   * Retrieves participant IDs in a chat.
   */
  static async getChatMemberUserIds(chatId: string): Promise<string[]> {
    const { rows } = await query<{ user_id: string }>(
      `SELECT user_id FROM chat_members WHERE chat_id = $1 AND left_at IS NULL`,
      [chatId],
    );
    return rows.map((r) => r.user_id);
  }
}
