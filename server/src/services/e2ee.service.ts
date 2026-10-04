import { query, withTransaction } from '../config/database';
import {
  PrekeyBundle,
  RegisterKeysParams,
  OneTimePrekey,
} from '../types/e2ee.types';
import { NotFoundError, BadRequestError } from '../utils/errors';

export class E2eeService {
  /**
   * Registers or updates a user's Signal Protocol cryptographic keys.
   */
  static async registerKeys(params: RegisterKeysParams): Promise<void> {
    const { userId, registrationId, identityKey, signedPrekey, oneTimePrekeys = [] } = params;

    if (!identityKey || !signedPrekey || typeof registrationId !== 'number') {
      throw new BadRequestError('Invalid key registration parameters', 'INVALID_KEYS');
    }

    await withTransaction(async (client) => {
      // 1. Upsert Identity Key
      await client.query(
        `INSERT INTO e2ee_identity_keys (user_id, registration_id, identity_key, updated_at)
         VALUES ($1, $2, $3, NOW())
         ON CONFLICT (user_id) DO UPDATE
         SET registration_id = EXCLUDED.registration_id,
             identity_key = EXCLUDED.identity_key,
             updated_at = NOW()`,
        [userId, registrationId, identityKey],
      );

      // 2. Upsert Signed Prekey
      await client.query(
        `INSERT INTO e2ee_signed_prekeys (user_id, key_id, public_key, signature)
         VALUES ($1, $2, $3, $4)
         ON CONFLICT (user_id, key_id) DO UPDATE
         SET public_key = EXCLUDED.public_key,
             signature = EXCLUDED.signature`,
        [userId, signedPrekey.keyId, signedPrekey.publicKey, signedPrekey.signature],
      );

      // 3. Insert One-Time Prekeys (batch)
      if (oneTimePrekeys.length > 0) {
        for (const otpk of oneTimePrekeys) {
          await client.query(
            `INSERT INTO e2ee_one_time_prekeys (user_id, key_id, public_key, is_used)
             VALUES ($1, $2, $3, FALSE)
             ON CONFLICT (user_id, key_id) DO NOTHING`,
            [userId, otpk.keyId, otpk.publicKey],
          );
        }
      }
    });
  }

  /**
   * Retrieves a Prekey Bundle to establish an X3DH session with a target user.
   * Consumes an unused One-Time Prekey atomically if available.
   */
  static async getPrekeyBundle(targetUserId: string): Promise<PrekeyBundle> {
    // 1. Check Identity Key
    const idRes = await query<{
      registration_id: number;
      identity_key: string;
    }>(
      `SELECT registration_id, identity_key
       FROM e2ee_identity_keys
       WHERE user_id = $1::uuid`,
      [targetUserId],
    );

    if (idRes.rows.length === 0) {
      throw new NotFoundError('User has not registered E2EE identity keys', 'KEYS_NOT_FOUND');
    }

    const { registration_id: registrationId, identity_key: identityKey } = idRes.rows[0];

    // 2. Check latest Signed Prekey
    const spkRes = await query<{
      key_id: number;
      public_key: string;
      signature: string;
    }>(
      `SELECT key_id, public_key, signature
       FROM e2ee_signed_prekeys
       WHERE user_id = $1::uuid
       ORDER BY created_at DESC
       LIMIT 1`,
      [targetUserId],
    );

    if (spkRes.rows.length === 0) {
      throw new NotFoundError('User has no signed prekey published', 'SIGNED_PREKEY_NOT_FOUND');
    }

    const spk = spkRes.rows[0];

    // 3. Atomically consume an unused One-Time Prekey (using FOR UPDATE SKIP LOCKED)
    let oneTimePrekey: OneTimePrekey | null = null;

    await withTransaction(async (client) => {
      const otpkRes = await client.query<{
        id: string;
        key_id: number;
        public_key: string;
      }>(
        `UPDATE e2ee_one_time_prekeys
         SET is_used = TRUE
         WHERE id = (
           SELECT id
           FROM e2ee_one_time_prekeys
           WHERE user_id = $1::uuid AND is_used = FALSE
           ORDER BY created_at ASC
           LIMIT 1
           FOR UPDATE SKIP LOCKED
         )
         RETURNING key_id, public_key`,
        [targetUserId],
      );

      if (otpkRes.rows.length > 0) {
        oneTimePrekey = {
          keyId: otpkRes.rows[0].key_id,
          publicKey: otpkRes.rows[0].public_key,
        };
      }
    });

    return {
      userId: targetUserId,
      registrationId,
      identityKey,
      signedPrekey: {
        keyId: spk.key_id,
        publicKey: spk.public_key,
        signature: spk.signature,
      },
      oneTimePrekey,
    };
  }

  /**
   * Returns count of remaining unused One-Time Prekeys for a user.
   */
  static async getUnusedPrekeysCount(userId: string): Promise<number> {
    const res = await query<{ count: string }>(
      `SELECT COUNT(*)::text as count
       FROM e2ee_one_time_prekeys
       WHERE user_id = $1::uuid AND is_used = FALSE`,
      [userId],
    );

    return parseInt(res.rows[0]?.count || '0', 10);
  }

  /**
   * Adds additional One-Time Prekeys to user's key pool.
   */
  static async replenishOneTimePrekeys(
    userId: string,
    keys: OneTimePrekey[],
  ): Promise<{ added: number }> {
    if (!Array.isArray(keys) || keys.length === 0) {
      return { added: 0 };
    }

    let added = 0;
    await withTransaction(async (client) => {
      for (const otpk of keys) {
        const res = await client.query(
          `INSERT INTO e2ee_one_time_prekeys (user_id, key_id, public_key, is_used)
           VALUES ($1, $2, $3, FALSE)
           ON CONFLICT (user_id, key_id) DO NOTHING`,
          [userId, otpk.keyId, otpk.publicKey],
        );
        if ((res.rowCount ?? 0) > 0) added++;
      }
    });

    return { added };
  }
}
