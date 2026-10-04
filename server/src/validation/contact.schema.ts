import { z } from 'zod';

export const sendContactRequestSchema = z.object({
  body: z.object({
    targetUserId: z.string().uuid().optional(),
    username: z.string().min(1).max(30).optional(),
  }).refine((data) => data.targetUserId || data.username, {
    message: 'Either targetUserId or username must be provided',
  }),
});

export const respondContactRequestSchema = z.object({
  params: z.object({
    requestId: z.string().uuid('Invalid request ID format'),
  }),
  body: z.object({
    action: z.enum(['accept', 'reject']),
  }),
});

export const removeContactSchema = z.object({
  params: z.object({
    targetUserId: z.string().uuid('Invalid target user ID format'),
  }),
});

export type SendContactRequestInput = z.infer<typeof sendContactRequestSchema>['body'];
export type RespondContactRequestInput = z.infer<typeof respondContactRequestSchema>['body'];
