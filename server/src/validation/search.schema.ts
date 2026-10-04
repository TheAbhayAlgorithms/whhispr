import { z } from 'zod';

export const searchMessagesSchema = z.object({
  query: z.object({
    q: z.string().min(1, 'Search query cannot be empty').max(200, 'Search query too long'),
    chatId: z.string().uuid('Invalid chat ID format').optional(),
    senderId: z.string().uuid('Invalid sender ID format').optional(),
    hasMedia: z
      .string()
      .optional()
      .transform((val) => val === 'true'),
    limit: z.coerce.number().min(1).max(50).default(20),
    offset: z.coerce.number().min(0).default(0),
  }),
});

export const searchUsersSchema = z.object({
  query: z.object({
    q: z.string().min(1, 'Search query cannot be empty').max(100),
    limit: z.coerce.number().min(1).max(50).default(20),
  }),
});

export const searchChatsSchema = z.object({
  query: z.object({
    q: z.string().min(1, 'Search query cannot be empty').max(100),
    limit: z.coerce.number().min(1).max(50).default(20),
  }),
});

export const searchAllSchema = z.object({
  query: z.object({
    q: z.string().min(1, 'Search query cannot be empty').max(200),
    limit: z.coerce.number().min(1).max(50).default(10),
  }),
});

export type SearchMessagesQuery = z.infer<typeof searchMessagesSchema>['query'];
export type SearchUsersQuery = z.infer<typeof searchUsersSchema>['query'];
export type SearchChatsQuery = z.infer<typeof searchChatsSchema>['query'];
export type SearchAllQuery = z.infer<typeof searchAllSchema>['query'];
