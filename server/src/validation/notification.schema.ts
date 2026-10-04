import { z } from 'zod';

export const notificationQuerySchema = z.object({
  query: z.object({
    limit: z
      .string()
      .optional()
      .transform((val) => (val ? parseInt(val, 10) : 50))
      .pipe(z.number().int().positive().max(100)),
    offset: z
      .string()
      .optional()
      .transform((val) => (val ? parseInt(val, 10) : 0))
      .pipe(z.number().int().min(0)),
    unreadOnly: z
      .string()
      .optional()
      .transform((val) => val === 'true'),
  }),
});

export const notificationIdParamsSchema = z.object({
  params: z.object({
    id: z.string().uuid({ message: 'Valid notification ID is required' }),
  }),
});

export const pushSubscriptionSchema = z.object({
  body: z.object({
    endpoint: z.string().url({ message: 'Valid push endpoint URL is required' }),
    p256dh: z.string().min(1, { message: 'p256dh key is required' }),
    auth: z.string().min(1, { message: 'auth secret is required' }),
    userAgent: z.string().optional(),
  }),
});

export const unsubscribePushSchema = z.object({
  body: z.object({
    endpoint: z.string().url({ message: 'Valid push endpoint URL is required' }),
  }),
});

export type NotificationQueryInput = z.infer<typeof notificationQuerySchema>['query'];
export type PushSubscriptionInput = z.infer<typeof pushSubscriptionSchema>['body'];
export type UnsubscribePushInput = z.infer<typeof unsubscribePushSchema>['body'];
