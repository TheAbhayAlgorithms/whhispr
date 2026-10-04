import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import bcrypt from 'bcryptjs';
import { env } from '../config/env';
import { query } from '../config/database';
import { UnauthorizedError } from '../utils/errors';

export interface TokenUserPayload {
  userId: string;
  email: string;
  username: string;
  role: string;
}

export interface DecodedAccessToken extends TokenUserPayload {
  iat: number;
  exp: number;
}

export class TokenService {
  /**
   * Generates a short-lived access JWT.
   */
  static generateAccessToken(payload: TokenUserPayload): string {
    const options: jwt.SignOptions = {
      expiresIn: env.JWT_ACCESS_EXPIRES_IN as jwt.SignOptions['expiresIn'],
    };
    return jwt.sign(payload, env.JWT_ACCESS_SECRET, options);
  }

  /**
   * Generates an opaque random refresh token, stores its hash in PostgreSQL, and returns the raw token.
   */
  static async generateRefreshToken(
    userId: string,
    userAgent?: string,
    ipAddress?: string,
  ): Promise<string> {
    const rawToken = crypto.randomBytes(40).toString('hex');
    const tokenHash = await bcrypt.hash(rawToken, 10);

    // Calculate expiry (default 7 days)
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);

    await query(
      `INSERT INTO refresh_tokens (user_id, token_hash, expires_at, user_agent, ip_address)
       VALUES ($1, $2, $3, $4, $5)`,
      [userId, tokenHash, expiresAt, userAgent ?? null, ipAddress ?? null],
    );

    return rawToken;
  }

  /**
   * Verifies and decodes an access token.
   */
  static verifyAccessToken(token: string): DecodedAccessToken {
    try {
      return jwt.verify(token, env.JWT_ACCESS_SECRET) as DecodedAccessToken;
    } catch (err: unknown) {
      if (err instanceof jwt.TokenExpiredError) {
        throw new UnauthorizedError('Access token has expired', 'TOKEN_EXPIRED');
      }
      throw new UnauthorizedError('Invalid access token', 'INVALID_TOKEN');
    }
  }

  /**
   * Rotates a refresh token: verifies against active tokens for the user, invalidates the used one,
   * and issues a new access token and refresh token.
   */
  static async rotateRefreshToken(
    rawToken: string,
    userAgent?: string,
    ipAddress?: string,
  ): Promise<{
    accessToken: string;
    refreshToken: string;
    user: TokenUserPayload;
  }> {
    // Fetch all active, non-expired tokens
    const { rows: tokens } = await query<{
      id: string;
      user_id: string;
      token_hash: string;
      expires_at: Date;
    }>(
      `SELECT id, user_id, token_hash, expires_at 
       FROM refresh_tokens 
       WHERE expires_at > NOW()`,
    );

    let matchedTokenRecord: (typeof tokens)[0] | null = null;
    for (const record of tokens) {
      const match = await bcrypt.compare(rawToken, record.token_hash);
      if (match) {
        matchedTokenRecord = record;
        break;
      }
    }

    if (!matchedTokenRecord) {
      throw new UnauthorizedError('Invalid or expired refresh token', 'INVALID_REFRESH_TOKEN');
    }

    // Delete the used token (token rotation prevents reuse attacks)
    await query(`DELETE FROM refresh_tokens WHERE id = $1`, [matchedTokenRecord.id]);

    // Fetch user details
    const { rows: users } = await query<{
      id: string;
      email: string;
      username: string;
      role: string;
      is_active: boolean;
    }>(`SELECT id, email, username, role, is_active FROM users WHERE id = $1`, [
      matchedTokenRecord.user_id,
    ]);

    const user = users[0];
    if (!user || !user.is_active) {
      throw new UnauthorizedError('User account is disabled or not found', 'USER_INACTIVE');
    }

    const payload: TokenUserPayload = {
      userId: user.id,
      email: user.email,
      username: user.username,
      role: user.role,
    };

    const newAccessToken = this.generateAccessToken(payload);
    const newRefreshToken = await this.generateRefreshToken(user.id, userAgent, ipAddress);

    return {
      accessToken: newAccessToken,
      refreshToken: newRefreshToken,
      user: payload,
    };
  }

  /**
   * Revokes a specific refresh token (used during logout).
   */
  static async revokeRefreshToken(rawToken: string): Promise<void> {
    const { rows: tokens } = await query<{ id: string; token_hash: string }>(
      `SELECT id, token_hash FROM refresh_tokens WHERE expires_at > NOW()`,
    );

    for (const record of tokens) {
      const match = await bcrypt.compare(rawToken, record.token_hash);
      if (match) {
        await query(`DELETE FROM refresh_tokens WHERE id = $1`, [record.id]);
        break;
      }
    }
  }

  /**
   * Revokes all refresh tokens for a user (logout all devices).
   */
  static async revokeAllUserTokens(userId: string): Promise<void> {
    await query(`DELETE FROM refresh_tokens WHERE user_id = $1`, [userId]);
  }
}
