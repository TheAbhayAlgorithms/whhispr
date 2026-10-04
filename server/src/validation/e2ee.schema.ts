import { z } from 'zod';

export const registerKeysSchema = z.object({
  body: z.object({
    registrationId: z.number().int().nonnegative(),
    identityKey: z.string().min(16, 'Identity key must be valid'),
    signedPrekey: z.object({
      keyId: z.number().int().nonnegative(),
      publicKey: z.string().min(16),
      signature: z.string().min(16),
    }),
    oneTimePrekeys: z
      .array(
        z.object({
          keyId: z.number().int().nonnegative(),
          publicKey: z.string().min(16),
        }),
      )
      .optional()
      .default([]),
  }),
});

export const replenishKeysSchema = z.object({
  body: z.object({
    keys: z
      .array(
        z.object({
          keyId: z.number().int().nonnegative(),
          publicKey: z.string().min(16),
        }),
      )
      .min(1, 'At least one key is required')
      .max(200, 'Cannot upload more than 200 keys at once'),
  }),
});

export const prekeyBundleParamsSchema = z.object({
  params: z.object({
    userId: z.string().uuid('Valid user ID is required'),
  }),
});

export type RegisterKeysInput = z.infer<typeof registerKeysSchema>['body'];
export type ReplenishKeysInput = z.infer<typeof replenishKeysSchema>['body'];
export type PrekeyBundleParamsInput = z.infer<typeof prekeyBundleParamsSchema>['params'];
