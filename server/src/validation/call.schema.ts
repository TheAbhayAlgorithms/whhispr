import { z } from 'zod';

export const logCallSchema = z.object({
  body: z.object({
    chatId: z.string().uuid().optional().nullable(),
    recipientId: z.string().uuid({ message: 'Valid recipient user ID is required' }),
    type: z.enum(['audio', 'video'], {
      required_error: 'Call type must be audio or video',
    }),
    status: z.enum(['missed', 'completed', 'rejected', 'busy', 'cancelled'], {
      required_error: 'Call status must be missed, completed, rejected, busy, or cancelled',
    }),
    duration: z.number().int().min(0).default(0),
    startedAt: z.string().datetime().optional(),
    endedAt: z.string().datetime().optional().nullable(),
  }),
});

export const callHistoryQuerySchema = z.object({
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
  }),
});

export type LogCallInput = z.infer<typeof logCallSchema>['body'];
export type CallHistoryQueryInput = z.infer<typeof callHistoryQuerySchema>['query'];
