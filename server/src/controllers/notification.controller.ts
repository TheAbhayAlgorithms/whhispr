import { Request, Response } from 'express';
import { NotificationService } from '../services/notification.service';
import { UnauthorizedError } from '../utils/errors';
import {
  NotificationQueryInput,
  PushSubscriptionInput,
  UnsubscribePushInput,
} from '../validation/notification.schema';

export class NotificationController {
  /**
   * Retrieves notifications list for the authenticated user.
   */
  static async getNotifications(req: Request, res: Response): Promise<void> {
    if (!req.user) throw new UnauthorizedError('Unauthorized');
    const query = req.query as unknown as NotificationQueryInput;

    const limit = query.limit ?? 50;
    const offset = query.offset ?? 0;
    const unreadOnly = Boolean(query.unreadOnly);

    const result = await NotificationService.getNotifications(
      req.user.userId,
      limit,
      offset,
      unreadOnly,
    );

    res.status(200).json({
      success: true,
      data: {
        notifications: result.notifications,
        total: result.total,
        unreadCount: result.unreadCount,
        limit,
        offset,
      },
    });
  }

  /**
   * Marks a single notification as read.
   */
  static async markAsRead(req: Request, res: Response): Promise<void> {
    if (!req.user) throw new UnauthorizedError('Unauthorized');
    const { id } = req.params;

    const notification = await NotificationService.markAsRead(req.user.userId, id);

    res.status(200).json({
      success: true,
      data: notification,
    });
  }

  /**
   * Marks all notifications as read for current user.
   */
  static async markAllAsRead(req: Request, res: Response): Promise<void> {
    if (!req.user) throw new UnauthorizedError('Unauthorized');

    const result = await NotificationService.markAllAsRead(req.user.userId);

    res.status(200).json({
      success: true,
      data: result,
    });
  }

  /**
   * Deletes a notification.
   */
  static async deleteNotification(req: Request, res: Response): Promise<void> {
    if (!req.user) throw new UnauthorizedError('Unauthorized');
    const { id } = req.params;

    await NotificationService.deleteNotification(req.user.userId, id);

    res.status(200).json({
      success: true,
      message: 'Notification deleted successfully',
    });
  }

  /**
   * Returns server VAPID public key.
   */
  static getVapidPublicKey(_req: Request, res: Response): void {
    const vapidPublicKey = NotificationService.getVapidPublicKey();

    res.status(200).json({
      success: true,
      data: { vapidPublicKey },
    });
  }

  /**
   * Saves Web Push subscription.
   */
  static async subscribePush(req: Request, res: Response): Promise<void> {
    if (!req.user) throw new UnauthorizedError('Unauthorized');
    const body = req.body as PushSubscriptionInput;

    await NotificationService.subscribePush(req.user.userId, body);

    res.status(201).json({
      success: true,
      message: 'Subscribed to push notifications successfully',
    });
  }

  /**
   * Removes Web Push subscription.
   */
  static async unsubscribePush(req: Request, res: Response): Promise<void> {
    if (!req.user) throw new UnauthorizedError('Unauthorized');
    const body = req.body as UnsubscribePushInput;

    await NotificationService.unsubscribePush(req.user.userId, body.endpoint);

    res.status(200).json({
      success: true,
      message: 'Unsubscribed from push notifications',
    });
  }
}
