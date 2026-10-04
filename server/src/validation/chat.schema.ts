import { z } from 'zod';

export const createDirectChatSchema = z.object({
  body: z.object({
    targetUserId: z.string().uuid('Invalid target user ID format'),
  }),
});

export const attachmentInputSchema = z.object({
  fileName: z.string().min(1, 'File name is required'),
  fileSize: z.number().int().positive('File size must be positive'),
  mimeType: z.string().min(1, 'MIME type is required'),
  storageKey: z.string().min(1, 'Storage key is required'),
  width: z.number().int().positive().optional(),
  height: z.number().int().positive().optional(),
  duration: z.number().int().positive().optional(),
});

export const sendMessageSchema = z.object({
  params: z.object({
    chatId: z.string().uuid('Invalid chat ID format'),
  }),
  body: z
    .object({
      content: z
        .string()
        .max(5000, 'Message cannot exceed 5000 characters')
        .optional()
        .default(''),
      replyToId: z.string().uuid('Invalid reply-to message ID format').optional(),
      type: z.enum(['text', 'image', 'video', 'audio', 'document']).optional(),
      attachments: z.array(attachmentInputSchema).optional(),
    })
    .refine(
      (data) =>
        (data.content && data.content.trim().length > 0) ||
        (data.attachments && data.attachments.length > 0),
      {
        message: 'Message must have either text content or at least one attachment',
        path: ['content'],
      },
    ),
});

export const getMessagesSchema = z.object({
  params: z.object({
    chatId: z.string().uuid('Invalid chat ID format'),
  }),
  query: z.object({
    cursor: z.string().uuid().optional(),
    limit: z.coerce.number().min(1).max(100).default(50),
  }),
});

export const markChatAsReadSchema = z.object({
  params: z.object({
    chatId: z.string().uuid('Invalid chat ID format'),
  }),
});

export const toggleReactionSchema = z.object({
  params: z.object({
    messageId: z.string().uuid('Invalid message ID format'),
  }),
  body: z.object({
    emoji: z.string().min(1, 'Emoji is required').max(16, 'Emoji too long'),
  }),
});

export const editMessageSchema = z.object({
  params: z.object({
    messageId: z.string().uuid('Invalid message ID format'),
  }),
  body: z.object({
    content: z
      .string()
      .min(1, 'Message content cannot be empty')
      .max(5000, 'Message cannot exceed 5000 characters'),
  }),
});

export const deleteMessageSchema = z.object({
  params: z.object({
    messageId: z.string().uuid('Invalid message ID format'),
  }),
  body: z
    .object({
      mode: z.enum(['me', 'everyone']).default('everyone'),
    })
    .optional(),
  query: z
    .object({
      mode: z.enum(['me', 'everyone']).optional(),
    })
    .optional(),
});

export type CreateDirectChatInput = z.infer<typeof createDirectChatSchema>['body'];
export type SendMessageInput = z.infer<typeof sendMessageSchema>['body'];
export type GetMessagesQuery = z.infer<typeof getMessagesSchema>['query'];
export type AttachmentInputSchema = z.infer<typeof attachmentInputSchema>;
export type ToggleReactionInput = z.infer<typeof toggleReactionSchema>['body'];
export type EditMessageInput = z.infer<typeof editMessageSchema>['body'];
export type DeleteMessageInput = z.infer<typeof deleteMessageSchema>['body'];

