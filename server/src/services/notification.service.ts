import { query } from '../config/database';
import { env } from '../config/env';
import { getIO } from '../sockets';
import {
  NotificationRecord,
  NotificationType,
  PushSubscriptionParams,
} from '../types/notification.types';
import { NotFoundError } from '../utils/errors';
import { logger } from '../utils/logger';

export interface CreateNotificationParams {
  userId: string;
  type: NotificationType;
  title: string;
  body?: string | null;
  data?: Record<string, unknown> | null;
}

export class NotificationService {
  /**
   * Creates an in-app notification and emits a real-time event to the user's socket room.
   */
  static async createNotification(params: CreateNotificationParams): Promise<NotificationRecord> {
    const { userId, type, title, body = null, data = null } = params;

    const res = await query<NotificationRecord>(
      `INSERT INTO notifications (user_id, type, title, body, data)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING id, user_id, type, title, body, data, is_read, read_at, created_at`,
      [userId, type, title, body, data ? JSON.stringify(data) : null],
    );

    const notification = res.rows[0];

    // Emit real-time notification to user's personal socket room
    try {
      const io = getIO();
      io.to(`user:${userId}`).emit('notification:new', notification);

      const unreadCount = await this.getUnreadCount(userId);
      io.to(`user:${userId}`).emit('notification:badge', { unreadCount });
    } catch {
      // Socket.IO may not be initialized in isolated unit tests
    }

    return notification;
  }

  /**
   * Returns list of notifications for a user with total and unread count.
   */
  static async getNotifications(
    userId: string,
    limit = 50,
    offset = 0,
    unreadOnly = false,
  ): Promise<{ notifications: NotificationRecord[]; total: number; unreadCount: number }> {
    const unreadCount = await this.getUnreadCount(userId);

    const countRes = await query<{ count: string }>(
      `SELECT COUNT(*)::text as count
       FROM notifications
       WHERE user_id = $1::uuid ${unreadOnly ? 'AND is_read = FALSE' : ''}`,
      [userId],
    );

    const total = parseInt(countRes.rows[0]?.count || '0', 10);

    const res = await query<NotificationRecord>(
      `SELECT id, user_id, type, title, body, data, is_read, read_at, created_at
       FROM notifications
       WHERE user_id = $1::uuid ${unreadOnly ? 'AND is_read = FALSE' : ''}
       ORDER BY created_at DESC
       LIMIT $2 OFFSET $3`,
      [userId, limit, offset],
    );

    return {
      notifications: res.rows,
      total,
      unreadCount,
    };
  }

  /**
   * Returns total count of unread notifications for a user.
   */
  static async getUnreadCount(userId: string): Promise<number> {
    const res = await query<{ count: string }>(
      `SELECT COUNT(*)::text as count
       FROM notifications
       WHERE user_id = $1::uuid AND is_read = FALSE`,
      [userId],
    );

    return parseInt(res.rows[0]?.count || '0', 10);
  }

  /**
   * Marks a specific notification as read.
   */
  static async markAsRead(userId: string, notificationId: string): Promise<NotificationRecord> {
    const res = await query<NotificationRecord>(
      `UPDATE notifications
       SET is_read = TRUE, read_at = NOW()
       WHERE id = $1::uuid AND user_id = $2::uuid
       RETURNING id, user_id, type, title, body, data, is_read, read_at, created_at`,
      [notificationId, userId],
    );

    if (res.rows.length === 0) {
      throw new NotFoundError('Notification not found', 'NOT_FOUND');
    }

    try {
      const io = getIO();
      const unreadCount = await this.getUnreadCount(userId);
      io.to(`user:${userId}`).emit('notification:badge', { unreadCount });
    } catch {
      // Ignore if socket not initialized
    }

    return res.rows[0];
  }

  /**
   * Marks all notifications as read for a user.
   */
  static async markAllAsRead(userId: string): Promise<{ updated: number }> {
    const res = await query(
      `UPDATE notifications
       SET is_read = TRUE, read_at = NOW()
       WHERE user_id = $1::uuid AND is_read = FALSE`,
      [userId],
    );

    try {
      const io = getIO();
      io.to(`user:${userId}`).emit('notification:badge', { unreadCount: 0 });
    } catch {
      // Ignore
    }

    return { updated: res.rowCount ?? 0 };
  }

  /**
   * Deletes a notification by ID.
   */
  static async deleteNotification(userId: string, notificationId: string): Promise<void> {
    const res = await query(
      `DELETE FROM notifications
       WHERE id = $1::uuid AND user_id = $2::uuid`,
      [notificationId, userId],
    );

    if ((res.rowCount ?? 0) === 0) {
      throw new NotFoundError('Notification not found', 'NOT_FOUND');
    }

    try {
      const io = getIO();
      const unreadCount = await this.getUnreadCount(userId);
      io.to(`user:${userId}`).emit('notification:badge', { unreadCount });
    } catch {
      // Ignore
    }
  }

  /**
   * Registers or updates a Web Push subscription.
   */
  static async subscribePush(
    userId: string,
    params: PushSubscriptionParams,
  ): Promise<{ success: boolean }> {
    const { endpoint, p256dh, auth, userAgent = null } = params;

    await query(
      `INSERT INTO push_subscriptions (user_id, endpoint, p256dh, auth, user_agent)
       VALUES ($1, $2, $3, $4, $5)
       ON CONFLICT (endpoint) DO UPDATE
       SET user_id = EXCLUDED.user_id,
           p256dh = EXCLUDED.p256dh,
           auth = EXCLUDED.auth,
           user_agent = EXCLUDED.user_agent`,
      [userId, endpoint, p256dh, auth, userAgent],
    );

    logger.info(`Web Push subscription registered for user ${userId}`);
    return { success: true };
  }

  /**
   * Unsubscribes an endpoint from Web Push notifications.
   */
  static async unsubscribePush(userId: string, endpoint: string): Promise<void> {
    await query(
      `DELETE FROM push_subscriptions
       WHERE user_id = $1::uuid AND endpoint = $2`,
      [userId, endpoint],
    );
  }

  /**
   * Returns the server's VAPID public key.
   */
  static getVapidPublicKey(): string {
    return env.VAPID_PUBLIC_KEY;
  }
}
