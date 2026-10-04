import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import { query, withTransaction } from '../config/database';
import { ConflictError, UnauthorizedError, NotFoundError, BadRequestError } from '../utils/errors';
import { TokenService, TokenUserPayload } from './token.service';
import { EmailService } from './email.service';
import { RegisterInput, LoginInput } from '../validation/auth.schema';

const BCRYPT_ROUNDS = 12;

export interface AuthResult {
  user: {
    id: string;
    email: string;
    username: string;
    displayName: string;
    role: string;
    isEmailVerified: boolean;
  };
  accessToken: string;
  refreshToken: string;
}

export class AuthService {
  /**
   * Registers a new user and profile.
   */
  static async register(
    input: RegisterInput,
    userAgent?: string,
    ipAddress?: string,
  ): Promise<AuthResult> {
    const { email, username, password, displayName } = input;

    // Check for existing user
    const { rows: existing } = await query<{ email: string; username: string }>(
      `SELECT email, username FROM users WHERE email = $1 OR username = $2 LIMIT 1`,
      [email.toLowerCase(), username.toLowerCase()],
    );

    if (existing.length > 0) {
      if (existing[0].email.toLowerCase() === email.toLowerCase()) {
        throw new ConflictError('An account with this email already exists', 'EMAIL_TAKEN');
      }
      throw new ConflictError('This username is already taken', 'USERNAME_TAKEN');
    }

    const passwordHash = await bcrypt.hash(password, BCRYPT_ROUNDS);
    const verifyToken = crypto.randomBytes(32).toString('hex');
    const verifyExpires = new Date();
    verifyExpires.setHours(verifyExpires.getHours() + 24);

    const name = displayName?.trim() || username;

    const user = await withTransaction(async (client) => {
      const userRes = await client.query<{
        id: string;
        email: string;
        username: string;
        role: string;
        is_email_verified: boolean;
      }>(
        `INSERT INTO users (
          email, username, password_hash, email_verify_token, email_verify_expires
        ) VALUES ($1, $2, $3, $4, $5)
        RETURNING id, email, username, role, is_email_verified`,
        [email.toLowerCase(), username.toLowerCase(), passwordHash, verifyToken, verifyExpires],
      );

      const newUser = userRes.rows[0];

      await client.query(
        `INSERT INTO profiles (user_id, display_name)
         VALUES ($1, $2)`,
        [newUser.id, name],
      );

      return newUser;
    });

    // Send verification email asynchronously
    void EmailService.sendVerificationEmail(user.email, verifyToken);

    const payload: TokenUserPayload = {
      userId: user.id,
      email: user.email,
      username: user.username,
      role: user.role,
    };

    const accessToken = TokenService.generateAccessToken(payload);
    const refreshToken = await TokenService.generateRefreshToken(user.id, userAgent, ipAddress);

    return {
      user: {
        id: user.id,
        email: user.email,
        username: user.username,
        displayName: name,
        role: user.role,
        isEmailVerified: user.is_email_verified,
      },
      accessToken,
      refreshToken,
    };
  }

  /**
   * Authenticates user credentials.
   */
  static async login(
    input: LoginInput,
    userAgent?: string,
    ipAddress?: string,
  ): Promise<AuthResult> {
    const { identifier, password } = input;

    const { rows: users } = await query<{
      id: string;
      email: string;
      username: string;
      password_hash: string;
      role: string;
      is_active: boolean;
      is_email_verified: boolean;
      display_name: string;
    }>(
      `SELECT u.id, u.email, u.username, u.password_hash, u.role, u.is_active, 
              u.is_email_verified, p.display_name
       FROM users u
       JOIN profiles p ON p.user_id = u.id
       WHERE u.email = $1 OR u.username = $1
       LIMIT 1`,
      [identifier.toLowerCase()],
    );

    const user = users[0];
    if (!user) {
      throw new UnauthorizedError('Invalid credentials', 'INVALID_CREDENTIALS');
    }

    if (!user.is_active) {
      throw new UnauthorizedError('Account has been deactivated', 'ACCOUNT_DEACTIVATED');
    }

    const isMatch = await bcrypt.compare(password, user.password_hash);
    if (!isMatch) {
      throw new UnauthorizedError('Invalid credentials', 'INVALID_CREDENTIALS');
    }

    const payload: TokenUserPayload = {
      userId: user.id,
      email: user.email,
      username: user.username,
      role: user.role,
    };

    const accessToken = TokenService.generateAccessToken(payload);
    const refreshToken = await TokenService.generateRefreshToken(user.id, userAgent, ipAddress);

    return {
      user: {
        id: user.id,
        email: user.email,
        username: user.username,
        displayName: user.display_name,
        role: user.role,
        isEmailVerified: user.is_email_verified,
      },
      accessToken,
      refreshToken,
    };
  }

  /**
   * Verifies an email token.
   */
  static async verifyEmail(token: string): Promise<void> {
    const { rows: users } = await query<{ id: string }>(
      `SELECT id FROM users 
       WHERE email_verify_token = $1 AND email_verify_expires > NOW()
       LIMIT 1`,
      [token],
    );

    if (users.length === 0) {
      throw new BadRequestError('Invalid or expired email verification link', 'INVALID_TOKEN');
    }

    await query(
      `UPDATE users 
       SET is_email_verified = TRUE, email_verify_token = NULL, email_verify_expires = NULL
       WHERE id = $1`,
      [users[0].id],
    );
  }

  /**
   * Generates a password reset token and sends an email.
   */
  static async forgotPassword(email: string): Promise<void> {
    const { rows: users } = await query<{ id: string; email: string }>(
      `SELECT id, email FROM users WHERE email = $1 LIMIT 1`,
      [email.toLowerCase()],
    );

    if (users.length === 0) {
      // Don't disclose whether an email exists
      return;
    }

    const resetToken = crypto.randomBytes(32).toString('hex');
    const resetExpires = new Date();
    resetExpires.setHours(resetExpires.getHours() + 1);

    await query(
      `UPDATE users 
       SET reset_password_token = $1, reset_password_expires = $2
       WHERE id = $3`,
      [resetToken, resetExpires, users[0].id],
    );

    void EmailService.sendPasswordResetEmail(users[0].email, resetToken);
  }

  /**
   * Resets password given a valid token.
   */
  static async resetPassword(token: string, newPassword: string): Promise<void> {
    const { rows: users } = await query<{ id: string }>(
      `SELECT id FROM users 
       WHERE reset_password_token = $1 AND reset_password_expires > NOW()
       LIMIT 1`,
      [token],
    );

    if (users.length === 0) {
      throw new BadRequestError('Invalid or expired password reset link', 'INVALID_TOKEN');
    }

    const passwordHash = await bcrypt.hash(newPassword, BCRYPT_ROUNDS);

    await query(
      `UPDATE users 
       SET password_hash = $1, reset_password_token = NULL, reset_password_expires = NULL
       WHERE id = $2`,
      [passwordHash, users[0].id],
    );

    // Invalidate all existing refresh tokens for security
    await TokenService.revokeAllUserTokens(users[0].id);
  }

  /**
   * Returns authenticated user profile information.
   */
  static async getCurrentUser(userId: string) {
    const { rows: users } = await query<{
      id: string;
      email: string;
      username: string;
      role: string;
      is_email_verified: boolean;
      display_name: string;
      avatar_url: string | null;
      bio: string | null;
      status_message: string | null;
      created_at: Date;
    }>(
      `SELECT u.id, u.email, u.username, u.role, u.is_email_verified, u.created_at,
              p.display_name, p.avatar_url, p.bio, p.status_message
       FROM users u
       JOIN profiles p ON p.user_id = u.id
       WHERE u.id = $1 AND u.is_active = TRUE
       LIMIT 1`,
      [userId],
    );

    if (users.length === 0) {
      throw new NotFoundError('User not found', 'USER_NOT_FOUND');
    }

    const row = users[0];
    return {
      id: row.id,
      email: row.email,
      username: row.username,
      displayName: row.display_name,
      avatarUrl: row.avatar_url,
      bio: row.bio,
      statusMessage: row.status_message,
      role: row.role,
      isEmailVerified: row.is_email_verified,
      createdAt: row.created_at,
    };
  }
}
