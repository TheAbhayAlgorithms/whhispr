import { z } from 'zod';

export const createGroupSchema = z.object({
  body: z.object({
    name: z
      .string({ required_error: 'Group name is required' })
      .trim()
      .min(2, 'Group name must be at least 2 characters')
      .max(100, 'Group name must not exceed 100 characters'),
    description: z.string().trim().max(500, 'Description must not exceed 500 characters').optional(),
    avatarUrl: z.string().url('Invalid avatar URL').optional().nullable(),
    memberIds: z
      .array(z.string().uuid('Invalid member user ID'))
      .optional()
      .default([]),
  }),
});

export const createChannelSchema = z.object({
  body: z.object({
    name: z
      .string({ required_error: 'Channel name is required' })
      .trim()
      .min(2, 'Channel name must be at least 2 characters')
      .max(100, 'Channel name must not exceed 100 characters'),
    description: z.string().trim().max(500, 'Description must not exceed 500 characters').optional(),
    avatarUrl: z.string().url('Invalid avatar URL').optional().nullable(),
    isPublic: z.boolean().optional().default(false),
    memberIds: z
      .array(z.string().uuid('Invalid member user ID'))
      .optional()
      .default([]),
  }),
});

export const updateGroupSchema = z.object({
  params: z.object({
    chatId: z.string().uuid('Invalid chat ID'),
  }),
  body: z.object({
    name: z.string().trim().min(2).max(100).optional(),
    description: z.string().trim().max(500).optional(),
    avatarUrl: z.string().url().optional().nullable(),
    isPublic: z.boolean().optional(),
  }),
});

export const addMembersSchema = z.object({
  params: z.object({
    chatId: z.string().uuid('Invalid chat ID'),
  }),
  body: z.object({
    memberIds: z
      .array(z.string().uuid('Invalid member ID'))
      .min(1, 'At least one member ID is required'),
  }),
});

export const changeMemberRoleSchema = z.object({
  params: z.object({
    chatId: z.string().uuid('Invalid chat ID'),
    targetUserId: z.string().uuid('Invalid target user ID'),
  }),
  body: z.object({
    role: z.enum(['admin', 'moderator', 'member'], {
      required_error: 'Valid role is required',
    }),
  }),
});

export const memberParamSchema = z.object({
  params: z.object({
    chatId: z.string().uuid('Invalid chat ID'),
    targetUserId: z.string().uuid('Invalid target user ID'),
  }),
});

export const chatParamSchema = z.object({
  params: z.object({
    chatId: z.string().uuid('Invalid chat ID'),
  }),
});

export const searchPublicChannelsSchema = z.object({
  query: z.object({
    q: z.string().trim().optional(),
    limit: z.coerce.number().int().min(1).max(100).default(20),
  }),
});

export type CreateGroupInput = z.infer<typeof createGroupSchema>['body'];
export type CreateChannelInput = z.infer<typeof createChannelSchema>['body'];
export type UpdateGroupInput = z.infer<typeof updateGroupSchema>['body'];
export type AddMembersInput = z.infer<typeof addMembersSchema>['body'];
export type ChangeMemberRoleInput = z.infer<typeof changeMemberRoleSchema>['body'];

