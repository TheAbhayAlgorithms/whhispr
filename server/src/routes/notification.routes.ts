import { Router } from 'express';
import { NotificationController } from '../controllers/notification.controller';
import { authenticate } from '../middleware/auth.middleware';
import { validate } from '../middleware/validate';
import { asyncHandler } from '../middleware/errorHandler';
import {
  notificationQuerySchema,
  notificationIdParamsSchema,
  pushSubscriptionSchema,
  unsubscribePushSchema,
} from '../validation/notification.schema';

const router = Router();

// All notification routes require authentication
router.use(authenticate);

// Get list of notifications with unread count
router.get(
  '/',
  validate(notificationQuerySchema),
  asyncHandler((req, res) => NotificationController.getNotifications(req, res)),
);

// Mark all notifications as read (MUST be before /:id/read)
router.patch(
  '/read-all',
  asyncHandler((req, res) => NotificationController.markAllAsRead(req, res)),
);

// Mark single notification as read
router.patch(
  '/:id/read',
  validate(notificationIdParamsSchema),
  asyncHandler((req, res) => NotificationController.markAsRead(req, res)),
);

// Delete single notification
router.delete(
  '/:id',
  validate(notificationIdParamsSchema),
  asyncHandler((req, res) => NotificationController.deleteNotification(req, res)),
);

// Get VAPID public key for Web Push subscription
router.get(
  '/push/vapid-key',
  (req, res) => NotificationController.getVapidPublicKey(req, res),
);

// Register Web Push subscription
router.post(
  '/push/subscribe',
  validate(pushSubscriptionSchema),
  asyncHandler((req, res) => NotificationController.subscribePush(req, res)),
);

// Remove Web Push subscription
router.delete(
  '/push/unsubscribe',
  validate(unsubscribePushSchema),
  asyncHandler((req, res) => NotificationController.unsubscribePush(req, res)),
);

export default router;
