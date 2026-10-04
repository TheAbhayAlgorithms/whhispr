import { query, withTransaction } from '../config/database';
import { BadRequestError, NotFoundError, ForbiddenError } from '../utils/errors';
import { getIO } from '../sockets';
import { logger } from '../utils/logger';

export type MemberRole = 'owner' | 'admin' | 'moderator' | 'member';

export interface GroupMemberItem {
  id: string;
  userId: string;
  role: MemberRole;
  joinedAt: Date;
  username: string;
  displayName: string;
  avatarUrl: string | null;
  statusMessage: string | null;
  lastSeen: Date | null;
}

export interface GroupDetails {
  id: string;
  type: 'group' | 'channel';
  name: string;
  description: string | null;
  avatarUrl: string | null;
  isPublic: boolean;
  createdBy: string | null;
  createdAt: Date;
  updatedAt: Date;
  callerRole: MemberRole | null;
  membersCount: number;
  members: GroupMemberItem[];
}

export interface PublicChannelItem {
  id: string;
  name: string;
  description: string | null;
  avatarUrl: string | null;
  createdAt: Date;
  memberCount: number;
  isJoined: boolean;
}

export class GroupService {
  /**
   * Helper: Check if user is a member of chat and return their role.
   */
  static async getMemberRole(chatId: string, userId: string): Promise<MemberRole | null> {
    const { rows } = await query<{ role: MemberRole }>(
      `SELECT role FROM chat_members 
       WHERE chat_id = $1 AND user_id = $2 AND left_at IS NULL
       LIMIT 1`,
      [chatId, userId],
    );
    return rows.length > 0 ? rows[0].role : null;
  }

  /**
   * Helper: Inserts a system message and notifies room.
   */
  private static async createSystemMessage(chatId: string, content: string): Promise<void> {
    try {
      const { rows } = await query<{ id: string; created_at: Date }>(
        `INSERT INTO messages (chat_id, type, content)
         VALUES ($1, 'system', $2)
         RETURNING id, created_at`,
        [chatId, content],
      );

      await query(`UPDATE chats SET updated_at = NOW() WHERE id = $1`, [chatId]);

      const systemMsg = {
        id: rows[0].id,
        chatId,
        senderId: null,
        type: 'system',
        content,
        replyToId: null,
        isEdited: false,
        createdAt: rows[0].created_at,
        updatedAt: rows[0].created_at,
        sender: {
          id: 'system',
          username: 'system',
          displayName: 'System',
          avatarUrl: null,
        },
      };

      const io = getIO();
      io.to(`chat:${chatId}`).emit('message:new', systemMsg);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      logger.warn('Failed to emit system message', { chatId, error: msg });
    }
  }

  /**
   * Creates a new group chat.
   */
  static async createGroup(
    creatorId: string,
    data: { name: string; description?: string; avatarUrl?: string | null; memberIds?: string[] },
  ): Promise<GroupDetails> {
    const uniqueMemberIds = Array.from(new Set(data.memberIds || [])).filter(
      (id) => id !== creatorId,
    );

    const chatId = await withTransaction(async (client) => {
      // 1. Insert chat
      const { rows: chatRows } = await client.query<{ id: string }>(
        `INSERT INTO chats (type, name, description, avatar_url, is_public, created_by)
         VALUES ('group', $1, $2, $3, FALSE, $4)
         RETURNING id`,
        [data.name.trim(), data.description?.trim() || null, data.avatarUrl || null, creatorId],
      );
      const newChatId = chatRows[0].id;

      // 2. Add creator as owner
      await client.query(
        `INSERT INTO chat_members (chat_id, user_id, role)
         VALUES ($1, $2, 'owner')`,
        [newChatId, creatorId],
      );

      // 3. Add initial members if any
      if (uniqueMemberIds.length > 0) {
        for (const memberId of uniqueMemberIds) {
          await client.query(
            `INSERT INTO chat_members (chat_id, user_id, role)
             VALUES ($1, $2, 'member')
             ON CONFLICT (chat_id, user_id) DO NOTHING`,
            [newChatId, memberId],
          );
        }
      }

      return newChatId;
    });

    await this.createSystemMessage(chatId, `Group "${data.name.trim()}" was created.`);

    // Fan-out socket activity notification to creator and added members
    try {
      const io = getIO();
      for (const mId of [creatorId, ...uniqueMemberIds]) {
        io.to(`user:${mId}`).emit('chat:activity', { chatId });
      }
    } catch {
      // Non-fatal
    }

    return this.getChatDetails(chatId, creatorId);
  }

  /**
   * Creates a new channel (public or private).
   */
  static async createChannel(
    creatorId: string,
    data: {
      name: string;
      description?: string;
      avatarUrl?: string | null;
      isPublic?: boolean;
      memberIds?: string[];
    },
  ): Promise<GroupDetails> {
    const isPublic = Boolean(data.isPublic);
    const uniqueMemberIds = Array.from(new Set(data.memberIds || [])).filter(
      (id) => id !== creatorId,
    );

    const chatId = await withTransaction(async (client) => {
      const { rows: chatRows } = await client.query<{ id: string }>(
        `INSERT INTO chats (type, name, description, avatar_url, is_public, created_by)
         VALUES ('channel', $1, $2, $3, $4, $5)
         RETURNING id`,
        [
          data.name.trim(),
          data.description?.trim() || null,
          data.avatarUrl || null,
          isPublic,
          creatorId,
        ],
      );
      const newChatId = chatRows[0].id;

      await client.query(
        `INSERT INTO chat_members (chat_id, user_id, role)
         VALUES ($1, $2, 'owner')`,
        [newChatId, creatorId],
      );

      if (uniqueMemberIds.length > 0) {
        for (const memberId of uniqueMemberIds) {
          await client.query(
            `INSERT INTO chat_members (chat_id, user_id, role)
             VALUES ($1, $2, 'member')
             ON CONFLICT (chat_id, user_id) DO NOTHING`,
            [newChatId, memberId],
          );
        }
      }

      return newChatId;
    });

    const kind = isPublic ? 'Public channel' : 'Private channel';
    await this.createSystemMessage(chatId, `${kind} #${data.name.trim()} was created.`);

    try {
      const io = getIO();
      for (const mId of [creatorId, ...uniqueMemberIds]) {
        io.to(`user:${mId}`).emit('chat:activity', { chatId });
      }
    } catch {
      // Non-fatal
    }

    return this.getChatDetails(chatId, creatorId);
  }

  /**
   * Retrieves group/channel details and member roster.
   */
  static async getChatDetails(chatId: string, userId: string): Promise<GroupDetails> {
    const { rows: chatRows } = await query<{
      id: string;
      type: 'group' | 'channel';
      name: string;
      description: string | null;
      avatar_url: string | null;
      is_public: boolean;
      created_by: string | null;
      created_at: Date;
      updated_at: Date;
    }>(
      `SELECT id, type, name, description, avatar_url, is_public, created_by, created_at, updated_at
       FROM chats
       WHERE id = $1 AND type IN ('group', 'channel')`,
      [chatId],
    );

    if (chatRows.length === 0) {
      throw new NotFoundError('Group or channel not found', 'CHAT_NOT_FOUND');
    }

    const chat = chatRows[0];
    const callerRole = await this.getMemberRole(chatId, userId);

    if (!callerRole && !chat.is_public) {
      throw new ForbiddenError(
        'You do not have permission to view this conversation',
        'NOT_A_MEMBER',
      );
    }

    const { rows: members } = await query<{
      id: string;
      user_id: string;
      role: MemberRole;
      joined_at: Date;
      username: string;
      display_name: string;
      avatar_url: string | null;
      status_message: string | null;
      last_seen: Date | null;
    }>(
      `SELECT cm.id, cm.user_id, cm.role, cm.joined_at,
              u.username, p.display_name, p.avatar_url, p.status_message, p.last_seen
       FROM chat_members cm
       JOIN users u ON u.id = cm.user_id
       JOIN profiles p ON p.user_id = u.id
       WHERE cm.chat_id = $1 AND cm.left_at IS NULL
       ORDER BY 
         CASE cm.role 
           WHEN 'owner' THEN 1 
           WHEN 'admin' THEN 2 
           WHEN 'moderator' THEN 3 
           ELSE 4 
         END,
         cm.joined_at ASC`,
      [chatId],
    );

    return {
      id: chat.id,
      type: chat.type,
      name: chat.name,
      description: chat.description,
      avatarUrl: chat.avatar_url,
      isPublic: chat.is_public,
      createdBy: chat.created_by,
      createdAt: chat.created_at,
      updatedAt: chat.updated_at,
      callerRole,
      membersCount: members.length,
      members: members.map((m) => ({
        id: m.id,
        userId: m.user_id,
        role: m.role,
        joinedAt: m.joined_at,
        username: m.username,
        displayName: m.display_name,
        avatarUrl: m.avatar_url,
        statusMessage: m.status_message,
        lastSeen: m.last_seen,
      })),
    };
  }

  /**
   * Adds new members to an existing group or channel.
   */
  static async addMembers(
    chatId: string,
    actorId: string,
    memberIds: string[],
  ): Promise<GroupDetails> {
    const actorRole = await this.getMemberRole(chatId, actorId);
    if (!actorRole || !['owner', 'admin', 'moderator'].includes(actorRole)) {
      throw new ForbiddenError(
        'Only owners, admins, or moderators can add members',
        'INSUFFICIENT_ROLE',
      );
    }

    const uniqueMemberIds = Array.from(new Set(memberIds));
    const addedCount = await withTransaction(async (client) => {
      let count = 0;
      for (const mId of uniqueMemberIds) {
        const { rowCount } = await client.query(
          `INSERT INTO chat_members (chat_id, user_id, role, left_at)
           VALUES ($1, $2, 'member', NULL)
           ON CONFLICT (chat_id, user_id) 
           DO UPDATE SET left_at = NULL, role = 'member'
           WHERE chat_members.left_at IS NOT NULL`,
          [chatId, mId],
        );
        if (rowCount && rowCount > 0) {
          count++;
        }
      }
      return count;
    });

    if (addedCount > 0) {
      const { rows: actorRows } = await query<{ display_name: string }>(
        `SELECT display_name FROM profiles WHERE user_id = $1`,
        [actorId],
      );
      const actorName = actorRows[0]?.display_name || 'An admin';
      await this.createSystemMessage(
        chatId,
        `${actorName} added ${addedCount} member${addedCount > 1 ? 's' : ''}.`,
      );

      try {
        const io = getIO();
        io.to(`chat:${chatId}`).emit('group:member_joined', { chatId, memberIds: uniqueMemberIds });
        for (const mId of uniqueMemberIds) {
          io.to(`user:${mId}`).emit('chat:activity', { chatId });
        }
      } catch {
        // Non-fatal
      }
    }

    return this.getChatDetails(chatId, actorId);
  }

  /**
   * Removes/kicks a member from a group or channel.
   */
  static async removeMember(
    chatId: string,
    actorId: string,
    targetUserId: string,
  ): Promise<GroupDetails> {
    if (actorId === targetUserId) {
      throw new BadRequestError('Use leaveChat to leave a conversation', 'CANNOT_KICK_SELF');
    }

    const actorRole = await this.getMemberRole(chatId, actorId);
    if (!actorRole || !['owner', 'admin', 'moderator'].includes(actorRole)) {
      throw new ForbiddenError('Insufficient permissions to remove members', 'INSUFFICIENT_ROLE');
    }

    const targetRole = await this.getMemberRole(chatId, targetUserId);
    if (!targetRole) {
      throw new NotFoundError('Target user is not an active member of this chat', 'MEMBER_NOT_FOUND');
    }

    // Role hierarchy rules:
    // Owner can kick anyone.
    // Admin can kick moderator and member.
    // Moderator can kick member.
    if (targetRole === 'owner') {
      throw new ForbiddenError('Group owner cannot be removed', 'CANNOT_REMOVE_OWNER');
    }
    if (actorRole === 'admin' && targetRole === 'admin') {
      throw new ForbiddenError('Admins cannot remove other admins', 'CANNOT_REMOVE_ADMIN');
    }
    if (actorRole === 'moderator' && (targetRole === 'admin' || targetRole === 'moderator')) {
      throw new ForbiddenError('Moderators cannot remove admins or moderators', 'CANNOT_REMOVE_MOD');
    }

    await query(
      `UPDATE chat_members SET left_at = NOW() WHERE chat_id = $1 AND user_id = $2`,
      [chatId, targetUserId],
    );

    const { rows: names } = await query<{
      actor_name: string;
      target_name: string;
    }>(
      `SELECT 
         (SELECT display_name FROM profiles WHERE user_id = $1) AS actor_name,
         (SELECT display_name FROM profiles WHERE user_id = $2) AS target_name`,
      [actorId, targetUserId],
    );

    const actorName = names[0]?.actor_name || 'Admin';
    const targetName = names[0]?.target_name || 'Member';

    await this.createSystemMessage(chatId, `${actorName} removed ${targetName} from the group.`);

    try {
      const io = getIO();
      io.to(`chat:${chatId}`).emit('group:member_left', { chatId, userId: targetUserId });
      io.to(`user:${targetUserId}`).emit('group:removed', { chatId });
    } catch {
      // Non-fatal
    }

    return this.getChatDetails(chatId, actorId);
  }

  /**
   * Caller voluntarily leaves a group or channel.
   */
  static async leaveChat(chatId: string, userId: string): Promise<{ success: boolean; message: string }> {
    const role = await this.getMemberRole(chatId, userId);
    if (!role) {
      throw new BadRequestError('You are not an active member of this chat', 'NOT_A_MEMBER');
    }

    await withTransaction(async (client) => {
      // If user is owner, check if there are other members and transfer ownership
      if (role === 'owner') {
        const { rows: successors } = await client.query<{ user_id: string }>(
          `SELECT user_id FROM chat_members 
           WHERE chat_id = $1 AND user_id != $2 AND left_at IS NULL
           ORDER BY 
             CASE role WHEN 'admin' THEN 1 WHEN 'moderator' THEN 2 ELSE 3 END,
             joined_at ASC
           LIMIT 1`,
          [chatId, userId],
        );

        if (successors.length > 0) {
          const nextOwnerId = successors[0].user_id;
          await client.query(
            `UPDATE chat_members SET role = 'owner' WHERE chat_id = $1 AND user_id = $2`,
            [chatId, nextOwnerId],
          );
          await client.query(
            `UPDATE chats SET created_by = $1 WHERE id = $2`,
            [nextOwnerId, chatId],
          );
        }
      }

      await client.query(
        `UPDATE chat_members SET left_at = NOW() WHERE chat_id = $1 AND user_id = $2`,
        [chatId, userId],
      );
    });

    const { rows: p } = await query<{ display_name: string }>(
      `SELECT display_name FROM profiles WHERE user_id = $1`,
      [userId],
    );
    const userName = p[0]?.display_name || 'A member';
    await this.createSystemMessage(chatId, `${userName} left the conversation.`);

    try {
      const io = getIO();
      io.to(`chat:${chatId}`).emit('group:member_left', { chatId, userId });
      io.to(`user:${userId}`).emit('chat:activity', { chatId });
    } catch {
      // Non-fatal
    }

    return { success: true, message: 'You have left the conversation' };
  }

  /**
   * Promotes or demotes a member's role.
   */
  static async updateMemberRole(
    chatId: string,
    actorId: string,
    targetUserId: string,
    newRole: 'admin' | 'moderator' | 'member',
  ): Promise<GroupDetails> {
    const actorRole = await this.getMemberRole(chatId, actorId);
    if (!actorRole || !['owner', 'admin'].includes(actorRole)) {
      throw new ForbiddenError('Only group owner or admins can change member roles', 'INSUFFICIENT_ROLE');
    }

    const targetRole = await this.getMemberRole(chatId, targetUserId);
    if (!targetRole) {
      throw new NotFoundError('Target user is not an active member', 'MEMBER_NOT_FOUND');
    }

    if (targetRole === 'owner') {
      throw new ForbiddenError('Cannot change the role of the group owner', 'CANNOT_MODIFY_OWNER');
    }

    // Admins cannot modify other admins or promote members to admin (only owner can)
    if (actorRole === 'admin') {
      if (targetRole === 'admin') {
        throw new ForbiddenError('Admins cannot change roles of fellow admins', 'INSUFFICIENT_ROLE');
      }
      if (newRole === 'admin') {
        throw new ForbiddenError('Only the owner can promote members to admin', 'INSUFFICIENT_ROLE');
      }
    }

    await query(
      `UPDATE chat_members SET role = $1 WHERE chat_id = $2 AND user_id = $3`,
      [newRole, chatId, targetUserId],
    );

    const { rows: names } = await query<{
      actor_name: string;
      target_name: string;
    }>(
      `SELECT 
         (SELECT display_name FROM profiles WHERE user_id = $1) AS actor_name,
         (SELECT display_name FROM profiles WHERE user_id = $2) AS target_name`,
      [actorId, targetUserId],
    );

    const actorName = names[0]?.actor_name || 'Admin';
    const targetName = names[0]?.target_name || 'Member';

    await this.createSystemMessage(chatId, `${actorName} updated ${targetName}'s role to ${newRole}.`);

    try {
      const io = getIO();
      io.to(`chat:${chatId}`).emit('group:role_changed', { chatId, userId: targetUserId, role: newRole });
    } catch {
      // Non-fatal
    }

    return this.getChatDetails(chatId, actorId);
  }

  /**
   * Updates group/channel metadata (name, topic/description, avatar, public flag).
   */
  static async updateChat(
    chatId: string,
    actorId: string,
    updates: { name?: string; description?: string; avatarUrl?: string | null; isPublic?: boolean },
  ): Promise<GroupDetails> {
    const actorRole = await this.getMemberRole(chatId, actorId);
    if (!actorRole || !['owner', 'admin'].includes(actorRole)) {
      throw new ForbiddenError('Only owner or admin can update group settings', 'INSUFFICIENT_ROLE');
    }

    const setClauses: string[] = [];
    const values: unknown[] = [chatId];

    if (updates.name !== undefined) {
      values.push(updates.name.trim());
      setClauses.push(`name = $${values.length}`);
    }
    if (updates.description !== undefined) {
      values.push(updates.description.trim() || null);
      setClauses.push(`description = $${values.length}`);
    }
    if (updates.avatarUrl !== undefined) {
      values.push(updates.avatarUrl);
      setClauses.push(`avatar_url = $${values.length}`);
    }
    if (updates.isPublic !== undefined) {
      values.push(Boolean(updates.isPublic));
      setClauses.push(`is_public = $${values.length}`);
    }

    if (setClauses.length > 0) {
      setClauses.push(`updated_at = NOW()`);
      await query(
        `UPDATE chats SET ${setClauses.join(', ')} WHERE id = $1`,
        values,
      );

      try {
        const io = getIO();
        io.to(`chat:${chatId}`).emit('group:updated', { chatId, updates });
      } catch {
        // Non-fatal
      }
    }

    return this.getChatDetails(chatId, actorId);
  }

  /**
   * Discovers and searches public channels.
   */
  static async browsePublicChannels(
    userId: string,
    queryStr?: string,
    limit = 20,
  ): Promise<PublicChannelItem[]> {
    const params: unknown[] = [userId, limit];
    let whereFilter = `c.type = 'channel' AND c.is_public = TRUE`;

    if (queryStr && queryStr.trim()) {
      params.push(`%${queryStr.trim().toLowerCase()}%`);
      whereFilter += ` AND (LOWER(c.name) LIKE $${params.length} OR LOWER(COALESCE(c.description, '')) LIKE $${params.length})`;
    }

    const { rows } = await query<{
      id: string;
      name: string;
      description: string | null;
      avatar_url: string | null;
      created_at: Date;
      member_count: string;
      is_joined: boolean;
    }>(
      `SELECT c.id, c.name, c.description, c.avatar_url, c.created_at,
              COUNT(cm.id) FILTER (WHERE cm.left_at IS NULL) AS member_count,
              BOOL_OR(cm.user_id = $1 AND cm.left_at IS NULL) AS is_joined
       FROM chats c
       LEFT JOIN chat_members cm ON cm.chat_id = c.id
       WHERE ${whereFilter}
       GROUP BY c.id
       ORDER BY c.created_at DESC, COUNT(cm.id) DESC
       LIMIT $2`,
      params,
    );

    return rows.map((r) => ({
      id: r.id,
      name: r.name,
      description: r.description,
      avatarUrl: r.avatar_url,
      createdAt: r.created_at,
      memberCount: parseInt(r.member_count, 10) || 0,
      isJoined: Boolean(r.is_joined),
    }));
  }

  /**
   * Joins a public channel.
   */
  static async joinPublicChannel(chatId: string, userId: string): Promise<GroupDetails> {
    const { rows: chatRows } = await query<{
      id: string;
      type: string;
      is_public: boolean;
      name: string;
    }>(
      `SELECT id, type, is_public, name FROM chats WHERE id = $1`,
      [chatId],
    );

    if (chatRows.length === 0) {
      throw new NotFoundError('Channel not found', 'CHANNEL_NOT_FOUND');
    }

    const channel = chatRows[0];
    if (channel.type !== 'channel' || !channel.is_public) {
      throw new ForbiddenError('Only public channels can be joined openly', 'NOT_PUBLIC_CHANNEL');
    }

    await query(
      `INSERT INTO chat_members (chat_id, user_id, role, left_at)
       VALUES ($1, $2, 'member', NULL)
       ON CONFLICT (chat_id, user_id) 
       DO UPDATE SET left_at = NULL`,
      [chatId, userId],
    );

    const { rows: u } = await query<{ display_name: string }>(
      `SELECT display_name FROM profiles WHERE user_id = $1`,
      [userId],
    );
    const userName = u[0]?.display_name || 'A user';
    await this.createSystemMessage(chatId, `${userName} joined #${channel.name}.`);

    try {
      const io = getIO();
      io.to(`chat:${chatId}`).emit('group:member_joined', { chatId, memberIds: [userId] });
      io.to(`user:${userId}`).emit('chat:activity', { chatId });
    } catch {
      // Non-fatal
    }

    return this.getChatDetails(chatId, userId);
  }
}
