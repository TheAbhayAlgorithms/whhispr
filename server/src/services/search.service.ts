import { query } from '../config/database';
import { UserService, PublicProfile } from './user.service';

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
  createdAt: Date;
  attachments: Array<{
    id: string;
    fileName: string;
    fileSize: number;
    mimeType: string;
    storageKey: string;
    publicUrl: string;
  }>;
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
  updatedAt: Date;
}

export interface SearchMessagesOptions {
  q: string;
  chatId?: string;
  senderId?: string;
  hasMedia?: boolean;
  limit?: number;
  offset?: number;
}

export interface UnifiedSearchResult {
  messages: SearchMessageResult[];
  users: PublicProfile[];
  chats: SearchChatResult[];
}

export class SearchService {
  /**
   * Full-text search across messages in chats that the caller is a member of.
   */
  static async searchMessages(
    userId: string,
    options: SearchMessagesOptions,
  ): Promise<{ messages: SearchMessageResult[]; total: number }> {
    const { q, chatId, senderId, hasMedia, limit = 20, offset = 0 } = options;
    const trimmedQuery = q.trim();

    if (!trimmedQuery) {
      return { messages: [], total: 0 };
    }

    const queryParams: unknown[] = [userId, trimmedQuery];
    let extraFilters = '';

    if (chatId) {
      queryParams.push(chatId);
      extraFilters += ` AND m.chat_id = $${queryParams.length}::uuid`;
    }

    if (senderId) {
      queryParams.push(senderId);
      extraFilters += ` AND m.sender_id = $${queryParams.length}::uuid`;
    }

    if (hasMedia) {
      extraFilters += ` AND EXISTS (SELECT 1 FROM attachments a WHERE a.message_id = m.id)`;
    }

    // 1. Count query
    const countSql = `
      SELECT COUNT(*)::int AS total
      FROM messages m
      JOIN chats c ON c.id = m.chat_id
      JOIN chat_members cm ON cm.chat_id = c.id AND cm.user_id = $1::uuid AND cm.left_at IS NULL
      WHERE m.is_deleted = FALSE
        AND NOT EXISTS (
          SELECT 1 FROM message_deletes md WHERE md.message_id = m.id AND md.user_id = $1::uuid
        )
        AND (
          to_tsvector('english', COALESCE(m.content, '')) @@ plainto_tsquery('english', $2)
          OR m.content ILIKE '%' || $2 || '%'
        )
        ${extraFilters}
    `;

    const { rows: countRows } = await query<{ total: number }>(countSql, queryParams);
    const total = countRows[0]?.total || 0;

    // 2. Data query
    const dataParams = [...queryParams, limit, offset];
    const dataSql = `
      SELECT m.id,
             m.chat_id,
             m.sender_id,
             m.type,
             m.content,
             m.reply_to_id,
             m.is_edited,
             m.created_at,
             u.username AS sender_username,
             p.display_name AS sender_display_name,
             p.avatar_url AS sender_avatar_url,
             c.type AS chat_type,
             CASE
               WHEN c.type = 'direct' THEN (
                 SELECT p_other.display_name
                 FROM chat_members cm_other
                 JOIN profiles p_other ON p_other.user_id = cm_other.user_id
                 WHERE cm_other.chat_id = c.id AND cm_other.user_id != $1::uuid
                 LIMIT 1
               )
               ELSE c.name
             END AS chat_name,
             CASE
               WHEN to_tsvector('english', COALESCE(m.content, '')) @@ plainto_tsquery('english', $2)
                 THEN ts_headline('english', COALESCE(m.content, ''), plainto_tsquery('english', $2), 'StartSel=<b>, StopSel=</b>, MaxWords=35, MinWords=15')
               ELSE m.content
             END AS headline,
             COALESCE(
               (
                 SELECT json_agg(json_build_object(
                   'id', a.id,
                   'fileName', a.file_name,
                   'fileSize', a.file_size,
                   'mimeType', a.mime_type,
                   'storageKey', a.storage_key,
                   'publicUrl', '/uploads/media/' || a.storage_key
                 ))
                 FROM attachments a
                 WHERE a.message_id = m.id
               ),
               '[]'::json
             ) AS attachments
      FROM messages m
      JOIN chats c ON c.id = m.chat_id
      JOIN chat_members cm ON cm.chat_id = c.id AND cm.user_id = $1::uuid AND cm.left_at IS NULL
      JOIN users u ON u.id = m.sender_id
      JOIN profiles p ON p.user_id = u.id
      WHERE m.is_deleted = FALSE
        AND NOT EXISTS (
          SELECT 1 FROM message_deletes md WHERE md.message_id = m.id AND md.user_id = $1::uuid
        )
        AND (
          to_tsvector('english', COALESCE(m.content, '')) @@ plainto_tsquery('english', $2)
          OR m.content ILIKE '%' || $2 || '%'
        )
        ${extraFilters}
      ORDER BY m.created_at DESC
      LIMIT $${dataParams.length - 1} OFFSET $${dataParams.length}
    `;

    const { rows } = await query<{
      id: string;
      chat_id: string;
      sender_id: string;
      type: string;
      content: string;
      reply_to_id: string | null;
      is_edited: boolean;
      created_at: Date;
      sender_username: string;
      sender_display_name: string;
      sender_avatar_url: string | null;
      chat_type: 'direct' | 'group' | 'channel';
      chat_name: string | null;
      headline: string;
      attachments: Array<{
        id: string;
        fileName: string;
        fileSize: number | string;
        mimeType: string;
        storageKey: string;
        publicUrl: string;
      }>;
    }>(dataSql, dataParams);

    const messages: SearchMessageResult[] = rows.map((r) => ({
      id: r.id,
      chatId: r.chat_id,
      chatName: r.chat_name,
      chatType: r.chat_type,
      senderId: r.sender_id,
      senderUsername: r.sender_username,
      senderDisplayName: r.sender_display_name,
      senderAvatarUrl: r.sender_avatar_url,
      type: r.type,
      content: r.content || '',
      headline: r.headline || r.content || '',
      replyToId: r.reply_to_id,
      isEdited: r.is_edited,
      createdAt: r.created_at,
      attachments: (r.attachments || []).map((att) => ({
        id: att.id,
        fileName: att.fileName,
        fileSize: Number(att.fileSize),
        mimeType: att.mimeType,
        storageKey: att.storageKey,
        publicUrl: att.publicUrl,
      })),
    }));

    return { messages, total };
  }

  /**
   * Search users by username or display name.
   */
  static async searchUsers(
    userId: string,
    queryStr: string,
    limit = 20,
  ): Promise<PublicProfile[]> {
    return UserService.searchUsers(queryStr, userId, limit);
  }

  /**
   * Search chats and channels (member groups + public channels + contacts).
   */
  static async searchChats(
    userId: string,
    queryStr: string,
    limit = 20,
  ): Promise<SearchChatResult[]> {
    const trimmed = queryStr.trim();
    if (!trimmed) return [];

    const { rows } = await query<{
      id: string;
      type: 'direct' | 'group' | 'channel';
      name: string;
      description: string | null;
      avatar_url: string | null;
      is_member: boolean;
      is_public: boolean;
      member_count: number;
      updated_at: Date;
    }>(
      `SELECT c.id,
              c.type,
              CASE
                WHEN c.type = 'direct' THEN (
                  SELECT p_other.display_name
                  FROM chat_members cm_other
                  JOIN profiles p_other ON p_other.user_id = cm_other.user_id
                  WHERE cm_other.chat_id = c.id AND cm_other.user_id != $1::uuid
                  LIMIT 1
                )
                ELSE c.name
              END AS name,
              c.description,
              c.avatar_url,
              EXISTS (
                SELECT 1 FROM chat_members cm WHERE cm.chat_id = c.id AND cm.user_id = $1::uuid AND cm.left_at IS NULL
              ) AS is_member,
              c.is_public,
              (
                SELECT COUNT(*)::int FROM chat_members cm_cnt WHERE cm_cnt.chat_id = c.id AND cm_cnt.left_at IS NULL
              ) AS member_count,
              c.updated_at
       FROM chats c
       WHERE (
         (c.is_public = TRUE AND (c.name ILIKE '%' || $2 || '%' OR COALESCE(c.description, '') ILIKE '%' || $2 || '%'))
         OR
         (
           EXISTS (SELECT 1 FROM chat_members cm WHERE cm.chat_id = c.id AND cm.user_id = $1::uuid AND cm.left_at IS NULL)
           AND (
             c.name ILIKE '%' || $2 || '%'
             OR COALESCE(c.description, '') ILIKE '%' || $2 || '%'
             OR (
               c.type = 'direct' AND EXISTS (
                 SELECT 1 FROM chat_members cm_d
                 JOIN users u_d ON u_d.id = cm_d.user_id
                 JOIN profiles p_d ON p_d.user_id = u_d.id
                 WHERE cm_d.chat_id = c.id AND cm_d.user_id != $1::uuid
                   AND (u_d.username ILIKE '%' || $2 || '%' OR p_d.display_name ILIKE '%' || $2 || '%')
               )
             )
           )
         )
       )
       ORDER BY c.updated_at DESC
       LIMIT $3`,
      [userId, trimmed, limit],
    );

    return rows.map((r) => ({
      id: r.id,
      type: r.type,
      name: r.name || 'Conversation',
      description: r.description,
      avatarUrl: r.avatar_url,
      isMember: Boolean(r.is_member),
      isPublic: Boolean(r.is_public),
      memberCount: Number(r.member_count),
      updatedAt: r.updated_at,
    }));
  }

  /**
   * Unified search across messages, users, and channels.
   */
  static async searchAll(
    userId: string,
    queryStr: string,
    limit = 10,
  ): Promise<UnifiedSearchResult> {
    const [msgRes, users, chats] = await Promise.all([
      this.searchMessages(userId, { q: queryStr, limit }),
      this.searchUsers(userId, queryStr, limit),
      this.searchChats(userId, queryStr, limit),
    ]);

    return {
      messages: msgRes.messages,
      users,
      chats,
    };
  }
}
