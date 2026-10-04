import { z } from 'zod';

export const updateProfileSchema = z.object({
  body: z.object({
    displayName: z
      .string()
      .min(2, 'Display name must be at least 2 characters')
      .max(60, 'Display name cannot exceed 60 characters')
      .optional(),
    bio: z.string().max(500, 'Bio cannot exceed 500 characters').nullable().optional(),
    statusMessage: z
      .string()
      .max(140, 'Status message cannot exceed 140 characters')
      .nullable()
      .optional(),
    lastSeenVisibility: z.enum(['everyone', 'contacts', 'nobody']).optional(),
    avatarVisibility: z.enum(['everyone', 'contacts', 'nobody']).optional(),
    addMePolicy: z.enum(['everyone', 'contacts', 'nobody']).optional(),
  }),
});

export const searchUsersSchema = z.object({
  query: z.object({
    q: z.string().min(1, 'Search query must be at least 1 character').max(50),
    limit: z
      .string()
      .regex(/^\d+$/)
      .transform(Number)
      .refine((n) => n >= 1 && n <= 50, { message: 'Limit must be between 1 and 50' })
      .optional(),
  }),
});

export const getUserProfileSchema = z.object({
  params: z.object({
    id: z.string().uuid('Invalid user ID format'),
  }),
});

export type UpdateProfileInput = z.infer<typeof updateProfileSchema>['body'];
export type SearchUsersQuery = z.infer<typeof searchUsersSchema>['query'];
