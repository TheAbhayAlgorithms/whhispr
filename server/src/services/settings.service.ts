import bcrypt from 'bcryptjs';
import { query, withTransaction } from '../config/database';
import {
  BadRequestError,
  NotFoundError,
  UnauthorizedError,
} from '../utils/errors';
import { TokenService } from './token.service';
import { ChangePasswordInput, DeleteAccountInput } from '../validation/settings.schema';

const BCRYPT_ROUNDS = 12;

export interface ActiveSession {
  id: string;
  userAgent: string | null;
  ipAddress: string | null;
  createdAt: string;
  expiresAt: string;
  isCurrent: boolean;
}

export class SettingsService {
  /**
   * Change the authenticated user's password.
   * Verifies the current password, hashes the new one,
   * and revokes all other refresh tokens for safety.
   */
  static async changePassword(
    userId: string,
    input: ChangePasswordInput,
    currentTokenId?: string,
  ): Promise<void> {
    const { currentPassword, newPassword } = input;

    // Fetch current hash
    const { rows } = await query<{ id: string; password_hash: string }>(
      `SELECT id, password_hash FROM users WHERE id = $1 AND is_active = TRUE`,
      [userId],
    );

    if (rows.length === 0) {
      throw new NotFoundError('User not found', 'USER_NOT_FOUND');
    }

    const isMatch = await bcrypt.compare(currentPassword, rows[0].password_hash);
    if (!isMatch) {
      throw new UnauthorizedError('Current password is incorrect', 'WRONG_PASSWORD');
    }

    if (currentPassword === newPassword) {
      throw new BadRequestError(
        'New password must be different from the current password',
        'SAME_PASSWORD',
      );
    }

    const newHash = await bcrypt.hash(newPassword, BCRYPT_ROUNDS);

    await query(`UPDATE users SET password_hash = $1, updated_at = NOW() WHERE id = $2`, [
      newHash,
      userId,
    ]);

    // Revoke all other sessions for security (keep the current one)
    if (currentTokenId) {
      await query(`DELETE FROM refresh_tokens WHERE user_id = $1 AND id != $2`, [
        userId,
        currentTokenId,
      ]);
    }
  }

  /**
   * Permanently delete the user's account.
   * Requires password verification and exact "DELETE" confirmation text.
   * Soft-deletes (deactivates) the account and removes refresh tokens.
   */
  static async deleteAccount(
    userId: string,
    input: DeleteAccountInput,
  ): Promise<void> {
    const { password } = input;

    const { rows } = await query<{ id: string; password_hash: string }>(
      `SELECT id, password_hash FROM users WHERE id = $1 AND is_active = TRUE`,
      [userId],
    );

    if (rows.length === 0) {
      throw new NotFoundError('User not found', 'USER_NOT_FOUND');
    }

    const isMatch = await bcrypt.compare(password, rows[0].password_hash);
    if (!isMatch) {
      throw new UnauthorizedError('Password is incorrect', 'WRONG_PASSWORD');
    }

    await withTransaction(async (client) => {
      // Soft-delete user account
      await client.query(
        `UPDATE users SET is_active = FALSE, updated_at = NOW() WHERE id = $1`,
        [userId],
      );

      // Clear sensitive profile data
      await client.query(
        `UPDATE profiles SET bio = NULL, status_message = NULL, avatar_url = NULL, updated_at = NOW() WHERE user_id = $1`,
        [userId],
      );

      // Revoke all refresh tokens
      await client.query(`DELETE FROM refresh_tokens WHERE user_id = $1`, [userId]);

      // Remove notification and push data
      await client.query(`DELETE FROM notifications WHERE user_id = $1`, [userId]);
      await client.query(`DELETE FROM push_subscriptions WHERE user_id = $1`, [userId]);
    });
  }

  /**
   * Lists all active sessions (refresh tokens) for the authenticated user.
   * Returns metadata: user agent, IP, creation time, and whether it's the current session.
   */
  static async listSessions(
    userId: string,
    currentTokenHash?: string,
  ): Promise<ActiveSession[]> {
    const { rows } = await query<{
      id: string;
      token_hash: string;
      user_agent: string | null;
      ip_address: string | null;
      created_at: string;
      expires_at: string;
    }>(
      `SELECT id, token_hash, user_agent, ip_address, created_at, expires_at
       FROM refresh_tokens
       WHERE user_id = $1 AND expires_at > NOW()
       ORDER BY created_at DESC`,
      [userId],
    );

    const sessions: ActiveSession[] = [];
    for (const row of rows) {
      let isCurrent = false;
      if (currentTokenHash) {
        try {
          isCurrent = await bcrypt.compare(currentTokenHash, row.token_hash);
        } catch {
          isCurrent = false;
        }
      }

      sessions.push({
        id: row.id,
        userAgent: row.user_agent,
        ipAddress: row.ip_address,
        createdAt: row.created_at,
        expiresAt: row.expires_at,
        isCurrent,
      });
    }

    return sessions;
  }

  /**
   * Revoke all sessions except the current one.
   */
  static async revokeOtherSessions(
    userId: string,
    currentTokenHash?: string,
  ): Promise<number> {
    if (!currentTokenHash) {
      // If no current token info, revoke everything
      const result = await query(
        `DELETE FROM refresh_tokens WHERE user_id = $1 AND expires_at > NOW()`,
        [userId],
      );
      return result.rowCount || 0;
    }

    // Get all active tokens, find the current one, delete the rest
    const { rows } = await query<{ id: string; token_hash: string }>(
      `SELECT id, token_hash FROM refresh_tokens WHERE user_id = $1 AND expires_at > NOW()`,
      [userId],
    );

    let currentTokenId: string | null = null;
    for (const row of rows) {
      try {
        const match = await bcrypt.compare(currentTokenHash, row.token_hash);
        if (match) {
          currentTokenId = row.id;
          break;
        }
      } catch {
        continue;
      }
    }

    if (currentTokenId) {
      const result = await query(
        `DELETE FROM refresh_tokens WHERE user_id = $1 AND id != $2 AND expires_at > NOW()`,
        [userId, currentTokenId],
      );
      return result.rowCount || 0;
    }

    // Fallback: revoke all
    const result = await query(
      `DELETE FROM refresh_tokens WHERE user_id = $1 AND expires_at > NOW()`,
      [userId],
    );
    return result.rowCount || 0;
  }

  /**
   * Revoke a specific session by its token ID.
   */
  static async revokeSession(userId: string, sessionId: string): Promise<void> {
    const result = await query(
      `DELETE FROM refresh_tokens WHERE id = $1 AND user_id = $2`,
      [sessionId, userId],
    );

    if (!result.rowCount || result.rowCount === 0) {
      throw new NotFoundError('Session not found', 'SESSION_NOT_FOUND');
    }
  }
}
