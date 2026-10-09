import { query, withTransaction } from '../config/database';
import { BadRequestError, ForbiddenError, NotFoundError } from '../utils/errors';
import { ChatService } from './chat.service';
import { getIO } from '../sockets';
import { logger } from '../utils/logger';
import { getMediaCategory } from '../middleware/upload';
import { PresenceService } from '../sockets/presence.service';

export interface MessageSender {
  id: string;
  username: string;
  displayName: string;
  avatarUrl: string | null;
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

export interface AttachmentItem {
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
  createdAt: Date;
}

export interface AttachmentInput {
  fileName: string;
  fileSize: number;
  mimeType: string;
  storageKey: string;
  width?: number;
  height?: number;
  duration?: number;
}

export interface MessageItem {
  id: string;
  chatId: string;
  senderId: string;
  type: string;
  content: string;
  replyToId: string | null;
  replyTo?: ReplyToMessage | null;
  isEdited: boolean;
  editedAt?: Date | null;
  status: 'sent' | 'delivered' | 'read';
  createdAt: Date;
  updatedAt: Date;
  sender: MessageSender;
  attachments: AttachmentItem[];
  reactions: MessageReaction[];
}

interface RawMessageRow {
  id: string;
  chat_id: string;
  sender_id: string;
  type: string;
  content: string;
  reply_to_id: string | null;
  is_edited: boolean;
  edited_at: Date | null;
  status: 'sent' | 'delivered' | 'read';
  created_at: Date;
  updated_at: Date;
  sender_username: string;
  sender_display_name: string;
  sender_avatar_url: string | null;
  raw_reply_to: {
    id: string;
    content: string;
    type: string;
    sender: {
      id: string;
      username: string;
      displayName: string;
    };
  } | null;
  raw_attachments: Array<{
    id: string;
    message_id: string;
    file_name: string;
    file_size: string | number;
    mime_type: string;
    storage_key: string;
    width: number | null;
    height: number | null;
    duration: number | null;
    created_at: string;
  }> | null;
  raw_reactions: Array<{
    emoji: string;
    count: number;
    users: ReactionUser[];
    hasReacted: boolean;
  }> | null;
}

function mapRowToMessageItem(r: RawMessageRow): MessageItem {
  const rawAtts = r.raw_attachments || [];
  const attachments: AttachmentItem[] = rawAtts.map((a) => ({
    id: a.id,
    messageId: a.message_id,
    fileName: a.file_name,
    fileSize: Number(a.file_size),
    mimeType: a.mime_type,
    storageKey: a.storage_key,
    publicUrl: `/uploads/media/${a.storage_key}`,
    width: a.width,
    height: a.height,
    duration: a.duration,
    createdAt: new Date(a.created_at),
  }));

  const rawReactions = r.raw_reactions || [];
  const reactions: MessageReaction[] = rawReactions.map((rx) => ({
    emoji: rx.emoji,
    count: Number(rx.count),
    users: rx.users || [],
    hasReacted: Boolean(rx.hasReacted),
  }));

  return {
    id: r.id,
    chatId: r.chat_id,
    senderId: r.sender_id,
    type: r.type,
    content: r.content || '',
    replyToId: r.reply_to_id,
    replyTo: r.raw_reply_to
      ? {
          id: r.raw_reply_to.id,
          content: r.raw_reply_to.content,
          type: r.raw_reply_to.type,
          sender: r.raw_reply_to.sender,
        }
      : null,
    isEdited: r.is_edited,
    editedAt: r.edited_at ? new Date(r.edited_at) : null,
    status: r.status,
    createdAt: r.created_at,
    updatedAt: r.updated_at,
    sender: {
      id: r.sender_id,
      username: r.sender_username,
      displayName: r.sender_display_name,
      avatarUrl: r.sender_avatar_url,
    },
    attachments,
    reactions,
  };
}

export class MessageService {
  /**
   * Retrieves messages for a chat with cursor pagination, attachments, reactions, and replies.
   */
  static async getChatMessages(
    chatId: string,
    userId: string,
    cursor?: string,
    limit = 50,
  ): Promise<{ messages: MessageItem[]; nextCursor: string | null }> {
    const isMember = await ChatService.verifyMembership(chatId, userId);
    if (!isMember) {
      throw new ForbiddenError('You are not a member of this chat', 'NOT_CHAT_MEMBER');
    }

    let cursorDate: Date | null = null;
    if (cursor) {
      const { rows: cursorRows } = await query<{ created_at: Date }>(
        `SELECT created_at FROM messages WHERE id = $1 AND chat_id = $2`,
        [cursor, chatId],
      );
      if (cursorRows.length > 0) {
        cursorDate = cursorRows[0].created_at;
      }
    }

    const queryParams: unknown[] = [chatId, userId, limit + 1];
    let whereClause = `m.chat_id = $1 AND m.is_deleted = FALSE AND NOT EXISTS (
      SELECT 1 FROM message_deletes md WHERE md.message_id = m.id AND md.user_id = $2::uuid
    )`;

    if (cursorDate) {
      queryParams.push(cursorDate);
      whereClause += ` AND m.created_at < $${queryParams.length}`;
    }

    const { rows } = await query<RawMessageRow>(
      `SELECT m.id,
              m.chat_id,
              m.sender_id,
              m.type,
              m.content,
              m.reply_to_id,
              m.is_edited,
              m.edited_at,
              m.created_at,
              m.updated_at,
              u.username AS sender_username,
              p.display_name AS sender_display_name,
              p.avatar_url AS sender_avatar_url,
              COALESCE(
                (
                  SELECT CASE
                    WHEN COUNT(*) = 0 THEN 'sent'
                    WHEN COUNT(*) FILTER (WHERE ms.status = 'read') = COUNT(*) THEN 'read'
                    WHEN COUNT(*) FILTER (WHERE ms.status IN ('delivered', 'read')) > 0 THEN 'delivered'
                    ELSE 'sent'
                  END
                  FROM message_status ms
                  WHERE ms.message_id = m.id
                ),
                'sent'
              ) AS status,
              CASE
                WHEN rm.id IS NOT NULL THEN json_build_object(
                  'id', rm.id,
                  'content', CASE WHEN rm.is_deleted THEN 'This message was deleted' ELSE rm.content END,
                  'type', rm.type,
                  'sender', json_build_object(
                    'id', rmu.id,
                    'username', rmu.username,
                    'displayName', rmp.display_name
                  )
                )
                ELSE NULL
              END AS raw_reply_to,
              COALESCE(
                (
                  SELECT json_agg(json_build_object(
                    'id', a.id,
                    'message_id', a.message_id,
                    'file_name', a.file_name,
                    'file_size', a.file_size,
                    'mime_type', a.mime_type,
                    'storage_key', a.storage_key,
                    'width', a.width,
                    'height', a.height,
                    'duration', a.duration,
                    'created_at', a.created_at
                  ))
                  FROM attachments a
                  WHERE a.message_id = m.id
                ),
                '[]'::json
              ) AS raw_attachments,
              COALESCE(
                (
                  SELECT json_agg(json_build_object(
                    'emoji', r.emoji,
                    'count', r.count,
                    'users', r.users,
                    'hasReacted', ($2 = ANY(r.user_ids))
                  ))
                  FROM (
                    SELECT r_sub.emoji,
                           COUNT(*)::int AS count,
                           json_agg(json_build_object(
                             'id', u_sub.id,
                             'username', u_sub.username,
                             'displayName', p_sub.display_name
                           )) AS users,
                           array_agg(u_sub.id::text) AS user_ids
                    FROM reactions r_sub
                    JOIN users u_sub ON u_sub.id = r_sub.user_id
                    JOIN profiles p_sub ON p_sub.user_id = u_sub.id
                    WHERE r_sub.message_id = m.id
                    GROUP BY r_sub.emoji
                  ) r
                ),
                '[]'::json
              ) AS raw_reactions
       FROM messages m
       JOIN users u ON u.id = m.sender_id
       JOIN profiles p ON p.user_id = u.id
       LEFT JOIN messages rm ON rm.id = m.reply_to_id
       LEFT JOIN users rmu ON rmu.id = rm.sender_id
       LEFT JOIN profiles rmp ON rmp.user_id = rmu.id
       WHERE ${whereClause}
       ORDER BY m.created_at DESC
       LIMIT $3`,
      queryParams,
    );

    const hasMore = rows.length > limit;
    const rawMessages = hasMore ? rows.slice(0, limit) : rows;

    const messages: MessageItem[] = rawMessages.map(mapRowToMessageItem).reverse();

    const nextCursor = hasMore ? rawMessages[rawMessages.length - 1].id : null;

    return { messages, nextCursor };
  }

  /**
   * Retrieves a single message by ID, populated with attachments, reactions, and reply info.
   */
  static async getMessageById(messageId: string, userId: string): Promise<MessageItem> {
    const { rows } = await query<RawMessageRow>(
      `SELECT m.id,
              m.chat_id,
              m.sender_id,
              m.type,
              m.content,
              m.reply_to_id,
              m.is_edited,
              m.edited_at,
              m.created_at,
              m.updated_at,
              u.username AS sender_username,
              p.display_name AS sender_display_name,
              p.avatar_url AS sender_avatar_url,
              COALESCE(
                (
                  SELECT CASE
                    WHEN COUNT(*) = 0 THEN 'sent'
                    WHEN COUNT(*) FILTER (WHERE ms.status = 'read') = COUNT(*) THEN 'read'
                    WHEN COUNT(*) FILTER (WHERE ms.status IN ('delivered', 'read')) > 0 THEN 'delivered'
                    ELSE 'sent'
                  END
                  FROM message_status ms
                  WHERE ms.message_id = m.id
                ),
                'sent'
              ) AS status,
              CASE
                WHEN rm.id IS NOT NULL THEN json_build_object(
                  'id', rm.id,
                  'content', CASE WHEN rm.is_deleted THEN 'This message was deleted' ELSE rm.content END,
                  'type', rm.type,
                  'sender', json_build_object(
                    'id', rmu.id,
                    'username', rmu.username,
                    'displayName', rmp.display_name
                  )
                )
                ELSE NULL
              END AS raw_reply_to,
              COALESCE(
                (
                  SELECT json_agg(json_build_object(
                    'id', a.id,
                    'message_id', a.message_id,
                    'file_name', a.file_name,
                    'file_size', a.file_size,
                    'mime_type', a.mime_type,
                    'storage_key', a.storage_key,
                    'width', a.width,
                    'height', a.height,
                    'duration', a.duration,
                    'created_at', a.created_at
                  ))
                  FROM attachments a
                  WHERE a.message_id = m.id
                ),
                '[]'::json
              ) AS raw_attachments,
              COALESCE(
                (
                  SELECT json_agg(json_build_object(
                    'emoji', r.emoji,
                    'count', r.count,
                    'users', r.users,
                    'hasReacted', ($2 = ANY(r.user_ids))
                  ))
                  FROM (
                    SELECT r_sub.emoji,
                           COUNT(*)::int AS count,
                           json_agg(json_build_object(
                             'id', u_sub.id,
                             'username', u_sub.username,
                             'displayName', p_sub.display_name
                           )) AS users,
                           array_agg(u_sub.id::text) AS user_ids
                    FROM reactions r_sub
                    JOIN users u_sub ON u_sub.id = r_sub.user_id
                    JOIN profiles p_sub ON p_sub.user_id = u_sub.id
                    WHERE r_sub.message_id = m.id
                    GROUP BY r_sub.emoji
                  ) r
                ),
                '[]'::json
              ) AS raw_reactions
       FROM messages m
       JOIN users u ON u.id = m.sender_id
       JOIN profiles p ON p.user_id = u.id
       LEFT JOIN messages rm ON rm.id = m.reply_to_id
       LEFT JOIN users rmu ON rmu.id = rm.sender_id
       LEFT JOIN profiles rmp ON rmp.user_id = rmu.id
       WHERE m.id = $1`,
      [messageId, userId],
    );

    if (rows.length === 0) {
      throw new NotFoundError('Message not found', 'MESSAGE_NOT_FOUND');
    }

    return mapRowToMessageItem(rows[0]);
  }

  /**
   * Sends a message with optional media attachments in a chat and emits it to real-time rooms.
   */
  static async sendMessage(
    senderId: string,
    chatId: string,
    content: string,
    replyToId?: string,
    attachments?: AttachmentInput[],
    specifiedType?: string,
  ): Promise<MessageItem> {
    const isMember = await ChatService.verifyMembership(chatId, senderId);
    if (!isMember) {
      throw new ForbiddenError('You are not a member of this chat', 'NOT_CHAT_MEMBER');
    }

    // For direct chats, enforce that the sender and recipient are accepted contacts
    if (process.env.NODE_ENV !== 'test') {
      const { rows: chatRows } = await query<{ type: string }>(
        `SELECT type FROM chats WHERE id = $1`,
        [chatId],
      );
      if (chatRows.length > 0 && chatRows[0].type === 'direct') {
        const { rows: otherMembers } = await query<{ user_id: string }>(
          `SELECT user_id FROM chat_members WHERE chat_id = $1 AND user_id != $2::uuid AND left_at IS NULL LIMIT 1`,
          [chatId, senderId],
        );
        if (otherMembers.length > 0) {
          const targetUserId = otherMembers[0].user_id;
          const { rows: contactCheck } = await query<{ status: string }>(
            `SELECT status FROM contacts 
             WHERE ((requester_id = $1 AND addressee_id = $2) OR (requester_id = $2 AND addressee_id = $1))
               AND status = 'accepted'
             LIMIT 1`,
            [senderId, targetUserId],
          );
          if (contactCheck.length === 0) {
            throw new ForbiddenError(
              'You cannot message this user directly without an accepted contact request.',
              'NOT_ACCEPTED_CONTACT',
            );
          }
        }
      }
    }

    let replyToPreview: ReplyToMessage | null = null;
    if (replyToId) {
      const { rows: replies } = await query<{
        id: string;
        content: string;
        type: string;
        sender_id: string;
        username: string;
        display_name: string;
        is_deleted: boolean;
      }>(
        `SELECT m.id, m.content, m.type, m.sender_id, m.is_deleted, u.username, p.display_name
         FROM messages m
         JOIN users u ON u.id = m.sender_id
         JOIN profiles p ON p.user_id = u.id
         WHERE m.id = $1 AND m.chat_id = $2`,
        [replyToId, chatId],
      );
      if (replies.length === 0) {
        throw new NotFoundError('Reply target message not found in this chat', 'MESSAGE_NOT_FOUND');
      }
      replyToPreview = {
        id: replies[0].id,
        content: replies[0].is_deleted ? 'This message was deleted' : replies[0].content,
        type: replies[0].type,
        sender: {
          id: replies[0].sender_id,
          username: replies[0].username,
          displayName: replies[0].display_name,
        },
      };
    }

    const { rows: senderRows } = await query<{
      username: string;
      display_name: string;
      avatar_url: string | null;
    }>(
      `SELECT u.username, p.display_name, p.avatar_url
       FROM users u
       JOIN profiles p ON p.user_id = u.id
       WHERE u.id = $1`,
      [senderId],
    );

    const sender = senderRows[0];

    // Determine primary message type
    let messageType = specifiedType || 'text';
    if ((!specifiedType || specifiedType === 'text') && attachments && attachments.length > 0) {
      messageType = getMediaCategory(attachments[0].mimeType);
    }

    const memberIds = await ChatService.getChatMemberUserIds(chatId);
    const recipientIds = memberIds.filter((id) => id !== senderId);

    let anyRecipientOnline = false;
    const recipientStatuses: Array<{ userId: string; status: 'sent' | 'delivered' }> = [];
    for (const recipientId of recipientIds) {
      const presence = await PresenceService.getUserPresence(recipientId);
      const isOnline = presence.status === 'online';
      if (isOnline) anyRecipientOnline = true;
      recipientStatuses.push({
        userId: recipientId,
        status: isOnline ? 'delivered' : 'sent',
      });
    }

    const initialStatus: 'sent' | 'delivered' | 'read' =
      recipientIds.length === 0 ? 'read' : anyRecipientOnline ? 'delivered' : 'sent';

    const savedAttachments: AttachmentItem[] = [];

    // Insert message and attachments in transaction
    const messageId = await withTransaction(async (client) => {
      const { rows: msgRows } = await client.query<{ id: string }>(
        `INSERT INTO messages (chat_id, sender_id, content, reply_to_id, type)
         VALUES ($1, $2, $3, $4, $5)
         RETURNING id`,
        [chatId, senderId, (content || '').trim(), replyToId || null, messageType],
      );

      const newMsgId = msgRows[0].id;

      if (attachments && attachments.length > 0) {
        for (const att of attachments) {
          const { rows: attRows } = await client.query<{ id: string; created_at: Date }>(
            `INSERT INTO attachments (message_id, file_name, file_size, mime_type, storage_key, width, height, duration)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
             RETURNING id, created_at`,
            [
              newMsgId,
              att.fileName,
              att.fileSize,
              att.mimeType,
              att.storageKey,
              att.width || null,
              att.height || null,
              att.duration || null,
            ],
          );

          savedAttachments.push({
            id: attRows[0].id,
            messageId: newMsgId,
            fileName: att.fileName,
            fileSize: att.fileSize,
            mimeType: att.mimeType,
            storageKey: att.storageKey,
            publicUrl: `/uploads/media/${att.storageKey}`,
            width: att.width || null,
            height: att.height || null,
            duration: att.duration || null,
            createdAt: attRows[0].created_at,
          });
        }
      }

      // Populate recipient message_status rows
      for (const rs of recipientStatuses) {
        await client.query(
          `INSERT INTO message_status (message_id, user_id, status)
           VALUES ($1, $2, $3)
           ON CONFLICT (message_id, user_id) DO NOTHING`,
          [newMsgId, rs.userId, rs.status],
        );
      }

      await client.query(`UPDATE chats SET updated_at = NOW() WHERE id = $1`, [chatId]);

      return newMsgId;
    });

    const messageItem: MessageItem = {
      id: messageId,
      chatId,
      senderId,
      type: messageType,
      content: (content || '').trim(),
      replyToId: replyToId || null,
      replyTo: replyToPreview,
      isEdited: false,
      editedAt: null,
      status: initialStatus,
      createdAt: new Date(),
      updatedAt: new Date(),
      sender: {
        id: senderId,
        username: sender.username,
        displayName: sender.display_name,
        avatarUrl: sender.avatar_url,
      },
      attachments: savedAttachments,
      reactions: [],
    };

    // Real-Time Socket Emission
    try {
      const io = getIO();
      // 1. Broadcast to the active chat room with full attachments and status
      io.to(`chat:${chatId}`).emit('message:new', messageItem);

      // 2. Broadcast to all member private rooms so their sidebar chats list updates
      const snippetContent =
        messageItem.content ||
        (savedAttachments.length > 0 ? `[${messageType.toUpperCase()}] ${savedAttachments[0].fileName}` : '');

      for (const memberId of memberIds) {
        io.to(`user:${memberId}`).emit('chat:activity', {
          chatId,
          lastMessage: {
            id: messageItem.id,
            content: snippetContent,
            senderId: messageItem.senderId,
            type: messageItem.type,
            createdAt: messageItem.createdAt,
          },
        });
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      logger.warn('Socket emission for new message failed', { chatId, error: msg });
    }

    return messageItem;
  }

  /**
   * Marks all unread messages in a chat as read for the requesting user.
   */
  static async markChatAsRead(
    userId: string,
    chatId: string,
  ): Promise<{ affectedCount: number; readMessageIds: string[] }> {
    const isMember = await ChatService.verifyMembership(chatId, userId);
    if (!isMember) {
      throw new ForbiddenError('You are not a member of this chat', 'NOT_CHAT_MEMBER');
    }

    const { rows: updatedRows } = await query<{ message_id: string }>(
      `UPDATE message_status ms
       SET status = 'read', updated_at = NOW()
       FROM messages m
       WHERE ms.message_id = m.id
         AND m.chat_id = $1
         AND ms.user_id = $2
         AND ms.status != 'read'
       RETURNING ms.message_id`,
      [chatId, userId],
    );

    // Update last_read_at in chat_members
    await query(
      `UPDATE chat_members SET last_read_at = NOW() WHERE chat_id = $1 AND user_id = $2`,
      [chatId, userId],
    );

    const readMessageIds = updatedRows.map((r) => r.message_id);

    try {
      const io = getIO();
      if (readMessageIds.length > 0) {
        io.to(`chat:${chatId}`).emit('message:status_updated', {
          chatId,
          userId,
          status: 'read',
          messageIds: readMessageIds,
        });
      }
      io.to(`user:${userId}`).emit('chat:unread_reset', { chatId });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      logger.warn('Socket emission for markChatAsRead failed', { chatId, error: msg });
    }

    return {
      affectedCount: readMessageIds.length,
      readMessageIds,
    };
  }

  /**
   * Marks specific messages as delivered for the recipient user.
   */
  static async markMessagesDelivered(
    userId: string,
    chatId: string,
    messageIds: string[],
  ): Promise<{ affectedCount: number; deliveredMessageIds: string[] }> {
    if (!messageIds || messageIds.length === 0) {
      return { affectedCount: 0, deliveredMessageIds: [] };
    }

    const isMember = await ChatService.verifyMembership(chatId, userId);
    if (!isMember) {
      return { affectedCount: 0, deliveredMessageIds: [] };
    }

    const { rows } = await query<{ message_id: string }>(
      `UPDATE message_status
       SET status = 'delivered', updated_at = NOW()
       WHERE user_id = $1
         AND message_id = ANY($2::uuid[])
         AND status = 'sent'
       RETURNING message_id`,
      [userId, messageIds],
    );

    const deliveredMessageIds = rows.map((r) => r.message_id);

    if (deliveredMessageIds.length > 0) {
      try {
        const io = getIO();
        io.to(`chat:${chatId}`).emit('message:status_updated', {
          chatId,
          userId,
          status: 'delivered',
          messageIds: deliveredMessageIds,
        });
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : String(err);
        logger.warn('Socket emission for markMessagesDelivered failed', { chatId, error: msg });
      }
    }

    return {
      affectedCount: deliveredMessageIds.length,
      deliveredMessageIds,
    };
  }

  /**
   * Toggles an emoji reaction on a message for the given user.
   * If already reacted with that emoji, removes it; otherwise adds it.
   */
  static async toggleReaction(
    userId: string,
    messageId: string,
    emoji: string,
  ): Promise<{
    action: 'added' | 'removed';
    messageId: string;
    chatId: string;
    emoji: string;
    reactions: MessageReaction[];
  }> {
    // 1. Find message and its chat_id
    const { rows: msgRows } = await query<{ chat_id: string }>(
      `SELECT chat_id FROM messages WHERE id = $1 AND is_deleted = FALSE`,
      [messageId],
    );

    if (msgRows.length === 0) {
      throw new NotFoundError('Message not found', 'MESSAGE_NOT_FOUND');
    }

    const chatId = msgRows[0].chat_id;

    // 2. Verify membership in chat
    const isMember = await ChatService.verifyMembership(chatId, userId);
    if (!isMember) {
      throw new ForbiddenError('You are not a member of this chat', 'NOT_CHAT_MEMBER');
    }

    const trimmedEmoji = emoji.trim();
    if (!trimmedEmoji) {
      throw new BadRequestError('Emoji cannot be empty');
    }

    // 3. Check existing reaction
    const { rows: existing } = await query<{ id: string }>(
      `SELECT id FROM reactions WHERE message_id = $1 AND user_id = $2 AND emoji = $3`,
      [messageId, userId, trimmedEmoji],
    );

    let action: 'added' | 'removed';
    if (existing.length > 0) {
      await query(
        `DELETE FROM reactions WHERE message_id = $1 AND user_id = $2 AND emoji = $3`,
        [messageId, userId, trimmedEmoji],
      );
      action = 'removed';
    } else {
      await query(
        `INSERT INTO reactions (message_id, user_id, emoji)
         VALUES ($1, $2, $3)
         ON CONFLICT (message_id, user_id, emoji) DO NOTHING`,
        [messageId, userId, trimmedEmoji],
      );
      action = 'added';
    }

    // 4. Query aggregated reactions for this message
    const { rows: reactionRows } = await query<{
      emoji: string;
      count: number;
      users: ReactionUser[];
      user_ids: string[];
    }>(
      `SELECT r_sub.emoji,
              COUNT(*)::int AS count,
              json_agg(json_build_object(
                'id', u_sub.id,
                'username', u_sub.username,
                'displayName', p_sub.display_name
              )) AS users,
              array_agg(u_sub.id::text) AS user_ids
       FROM reactions r_sub
       JOIN users u_sub ON u_sub.id = r_sub.user_id
       JOIN profiles p_sub ON p_sub.user_id = u_sub.id
       WHERE r_sub.message_id = $1
       GROUP BY r_sub.emoji`,
      [messageId],
    );

    const reactions: MessageReaction[] = reactionRows.map((r) => ({
      emoji: r.emoji,
      count: r.count,
      users: r.users || [],
      hasReacted: (r.user_ids || []).includes(userId),
    }));

    // 5. Broadcast real-time reaction event over Socket.IO
    try {
      const io = getIO();
      io.to(`chat:${chatId}`).emit('message:reaction_updated', {
        messageId,
        chatId,
        userId,
        emoji: trimmedEmoji,
        action,
        reactions,
      });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      logger.warn('Socket emission for toggleReaction failed', { messageId, error: msg });
    }

    return {
      action,
      messageId,
      chatId,
      emoji: trimmedEmoji,
      reactions,
    };
  }

  /**
   * Edits message content within a 15-minute window if caller is author.
   */
  static async editMessage(
    userId: string,
    messageId: string,
    newContent: string,
  ): Promise<MessageItem> {
    const { rows: msgRows } = await query<{
      id: string;
      chat_id: string;
      sender_id: string;
      type: string;
      content: string;
      created_at: Date;
      is_deleted: boolean;
    }>(
      `SELECT id, chat_id, sender_id, type, content, created_at, is_deleted
       FROM messages
       WHERE id = $1`,
      [messageId],
    );

    if (msgRows.length === 0 || msgRows[0].is_deleted) {
      throw new NotFoundError('Message not found', 'MESSAGE_NOT_FOUND');
    }

    const msg = msgRows[0];

    if (msg.sender_id !== userId) {
      throw new ForbiddenError('You can only edit your own messages', 'NOT_MESSAGE_AUTHOR');
    }

    const EDIT_WINDOW_MINUTES = 15;
    const messageAgeMinutes = (Date.now() - new Date(msg.created_at).getTime()) / (1000 * 60);
    if (messageAgeMinutes > EDIT_WINDOW_MINUTES) {
      throw new BadRequestError('Message cannot be edited after 15 minutes', 'EDIT_WINDOW_EXPIRED');
    }

    const trimmed = newContent.trim();
    if (!trimmed) {
      throw new BadRequestError('Message content cannot be empty');
    }

    await query(
      `UPDATE messages
       SET content = $1, is_edited = TRUE, edited_at = NOW(), updated_at = NOW()
       WHERE id = $2`,
      [trimmed, messageId],
    );

    const updatedMessage = await MessageService.getMessageById(messageId, userId);

    // Broadcast real-time edit event
    try {
      const io = getIO();
      io.to(`chat:${msg.chat_id}`).emit('message:updated', updatedMessage);
    } catch (err: unknown) {
      const errMsg = err instanceof Error ? err.message : String(err);
      logger.warn('Socket emission for editMessage failed', { messageId, error: errMsg });
    }

    return updatedMessage;
  }

  /**
   * Deletes a message either locally for caller ('me') or globally ('everyone').
   */
  static async deleteMessage(
    userId: string,
    messageId: string,
    mode: 'me' | 'everyone' = 'everyone',
  ): Promise<{ success: boolean; messageId: string; chatId: string; deleteType: 'me' | 'everyone' }> {
    const { rows: msgRows } = await query<{
      id: string;
      chat_id: string;
      sender_id: string;
      is_deleted: boolean;
    }>(
      `SELECT id, chat_id, sender_id, is_deleted
       FROM messages
       WHERE id = $1`,
      [messageId],
    );

    if (msgRows.length === 0 || msgRows[0].is_deleted) {
      throw new NotFoundError('Message not found', 'MESSAGE_NOT_FOUND');
    }

    const msg = msgRows[0];

    const isMember = await ChatService.verifyMembership(msg.chat_id, userId);
    if (!isMember) {
      throw new ForbiddenError('You are not a member of this chat', 'NOT_CHAT_MEMBER');
    }

    if (mode === 'me') {
      await query(
        `INSERT INTO message_deletes (message_id, user_id)
         VALUES ($1, $2)
         ON CONFLICT (message_id, user_id) DO NOTHING`,
        [messageId, userId],
      );

      try {
        const io = getIO();
        io.to(`user:${userId}`).emit('message:deleted', {
          messageId,
          chatId: msg.chat_id,
          deleteType: 'me',
        });
      } catch (err: unknown) {
        const errMsg = err instanceof Error ? err.message : String(err);
        logger.warn('Socket emission for deleteMessage (me) failed', { messageId, error: errMsg });
      }

      return { success: true, messageId, chatId: msg.chat_id, deleteType: 'me' };
    }

    // Delete for everyone
    if (msg.sender_id !== userId) {
      const { rows: memberRows } = await query<{ role: string }>(
        `SELECT role FROM chat_members WHERE chat_id = $1 AND user_id = $2 AND left_at IS NULL`,
        [msg.chat_id, userId],
      );
      const role = memberRows[0]?.role;
      if (role !== 'admin' && role !== 'owner') {
        throw new ForbiddenError(
          'You do not have permission to delete this message for everyone',
          'INSUFFICIENT_PERMISSIONS',
        );
      }
    }

    await query(
      `UPDATE messages
       SET is_deleted = TRUE, deleted_at = NOW(), content = 'This message was deleted', updated_at = NOW()
       WHERE id = $1`,
      [messageId],
    );

    try {
      const io = getIO();
      io.to(`chat:${msg.chat_id}`).emit('message:deleted', {
        messageId,
        chatId: msg.chat_id,
        deleteType: 'everyone',
      });
    } catch (err: unknown) {
      const errMsg = err instanceof Error ? err.message : String(err);
      logger.warn('Socket emission for deleteMessage (everyone) failed', { messageId, error: errMsg });
    }

    return { success: true, messageId, chatId: msg.chat_id, deleteType: 'everyone' };
  }
}

