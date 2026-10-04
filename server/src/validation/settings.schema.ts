import { z } from 'zod';

/**
 * Change password — requires current password for verification
 * and a new password meeting strength requirements.
 */
export const changePasswordSchema = z.object({
  body: z.object({
    currentPassword: z.string().min(1, 'Current password is required'),
    newPassword: z
      .string()
      .min(8, 'New password must be at least 8 characters')
      .max(128, 'Password too long')
      .regex(
        /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/,
        'Password must contain uppercase, lowercase, and a digit',
      ),
  }),
});

export type ChangePasswordInput = z.infer<typeof changePasswordSchema>['body'];

/**
 * Delete account — requires password confirmation for safety.
 */
export const deleteAccountSchema = z.object({
  body: z.object({
    password: z.string().min(1, 'Password is required to confirm deletion'),
    confirmText: z.literal('DELETE', {
      errorMap: () => ({ message: 'You must type DELETE to confirm' }),
    }),
  }),
});

export type DeleteAccountInput = z.infer<typeof deleteAccountSchema>['body'];
