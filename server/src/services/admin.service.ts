import { query } from '../config/database';
import { NotFoundError, BadRequestError } from '../utils/errors';

export interface AdminStats {
  totalUsers: number;
  totalMessages: number;
  totalChats: number;
  activeUsers: number;
}

export interface AdminUserRecord {
  id: string;
  username: string;
  email: string;
  displayName: string;
  avatarUrl: string | null;
  role: 'user' | 'admin';
  isActive: boolean;
  isEmailVerified: boolean;
  lastSeen: Date | null;
  createdAt: Date;
}

export interface AdminMessageRecord {
  id: string;
  chatId: string;
  chatType: string;
  chatName: string | null;
  senderId: string | null;
  senderName: string | null;
  senderUsername: string | null;
  content: string;
  type: string;
  isDeleted: boolean;
  createdAt: Date;
}

export class AdminService {
  static async getStats(): Promise<AdminStats> {
    const [userRes, msgRes, chatRes, activeRes] = await Promise.all([
      query<{ count: string }>('SELECT COUNT(*) as count FROM users'),
      query<{ count: string }>('SELECT COUNT(*) as count FROM messages'),
      query<{ count: string }>('SELECT COUNT(*) as count FROM chats'),
      query<{ count: string }>('SELECT COUNT(*) as count FROM users WHERE is_active = true'),
    ]);

    return {
      totalUsers: parseInt(userRes.rows[0]?.count || '0', 10),
      totalMessages: parseInt(msgRes.rows[0]?.count || '0', 10),
      totalChats: parseInt(chatRes.rows[0]?.count || '0', 10),
      activeUsers: parseInt(activeRes.rows[0]?.count || '0', 10),
    };
  }

  static async getAllUsers(): Promise<AdminUserRecord[]> {
    const { rows } = await query<{
      id: string;
      username: string;
      email: string;
      display_name: string;
      avatar_url: string | null;
      role: 'user' | 'admin';
      is_active: boolean;
      is_email_verified: boolean;
      last_seen: Date | null;
      created_at: Date;
    }>(
      `SELECT u.id, u.username, u.email, p.display_name, p.avatar_url,
              u.role, u.is_active, u.is_email_verified, p.last_seen, u.created_at
       FROM users u
       JOIN profiles p ON p.user_id = u.id
       ORDER BY u.created_at DESC`,
    );

    return rows.map((r) => ({
      id: r.id,
      username: r.username,
      email: r.email,
      displayName: r.display_name,
      avatarUrl: r.avatar_url,
      role: r.role,
      isActive: r.is_active,
      isEmailVerified: r.is_email_verified,
      lastSeen: r.last_seen,
      createdAt: r.created_at,
    }));
  }

  static async updateUserStatus(
    targetUserId: string,
    isActive: boolean,
    currentAdminId: string,
  ): Promise<{ id: string; isActive: boolean }> {
    if (targetUserId === currentAdminId && !isActive) {
      throw new BadRequestError('You cannot deactivate your own admin account', 'CANNOT_DEACTIVATE_SELF');
    }

    const { rows } = await query<{ id: string; is_active: boolean }>(
      `UPDATE users SET is_active = $1, updated_at = NOW() WHERE id = $2 RETURNING id, is_active`,
      [isActive, targetUserId],
    );

    if (rows.length === 0) {
      throw new NotFoundError('User not found', 'USER_NOT_FOUND');
    }

    return { id: rows[0].id, isActive: rows[0].is_active };
  }

  static async updateUserRole(
    targetUserId: string,
    role: 'user' | 'admin',
    currentAdminId: string,
  ): Promise<{ id: string; role: 'user' | 'admin' }> {
    if (targetUserId === currentAdminId && role !== 'admin') {
      throw new BadRequestError('You cannot demote yourself from admin', 'CANNOT_DEMOTE_SELF');
    }

    const { rows } = await query<{ id: string; role: 'user' | 'admin' }>(
      `UPDATE users SET role = $1, updated_at = NOW() WHERE id = $2 RETURNING id, role`,
      [role, targetUserId],
    );

    if (rows.length === 0) {
      throw new NotFoundError('User not found', 'USER_NOT_FOUND');
    }

    return { id: rows[0].id, role: rows[0].role };
  }

  static async getAllMessages(limit = 100): Promise<AdminMessageRecord[]> {
    const safeLimit = Math.min(Math.max(1, limit), 200);

    const { rows } = await query<{
      id: string;
      chat_id: string;
      chat_type: string;
      chat_name: string | null;
      sender_id: string | null;
      sender_name: string | null;
      sender_username: string | null;
      content: string;
      type: string;
      is_deleted: boolean;
      created_at: Date;
    }>(
      `SELECT m.id, m.chat_id, c.type AS chat_type, c.name AS chat_name,
              m.sender_id, p.display_name AS sender_name, u.username AS sender_username,
              m.content, m.type, m.is_deleted, m.created_at
       FROM messages m
       JOIN chats c ON c.id = m.chat_id
       LEFT JOIN users u ON u.id = m.sender_id
       LEFT JOIN profiles p ON p.user_id = m.sender_id
       ORDER BY m.created_at DESC
       LIMIT $1`,
      [safeLimit],
    );

    return rows.map((r) => ({
      id: r.id,
      chatId: r.chat_id,
      chatType: r.chat_type,
      chatName: r.chat_name,
      senderId: r.sender_id,
      senderName: r.sender_name,
      senderUsername: r.sender_username,
      content: r.content,
      type: r.type,
      isDeleted: r.is_deleted,
      createdAt: r.created_at,
    }));
  }

  static async deleteMessage(messageId: string): Promise<void> {
    const { rowCount } = await query(
      `UPDATE messages
       SET is_deleted = true, content = '[Message deleted by admin]', updated_at = NOW()
       WHERE id = $1`,
      [messageId],
    );

    if (!rowCount || rowCount === 0) {
      throw new NotFoundError('Message not found', 'MESSAGE_NOT_FOUND');
    }
  }
}
