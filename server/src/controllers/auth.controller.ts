import { Request, Response } from 'express';
import { AuthService } from '../services/auth.service';
import { TokenService } from '../services/token.service';
import { UnauthorizedError } from '../utils/errors';
import { env } from '../config/env';
import {
  RegisterInput,
  LoginInput,
  ForgotPasswordInput,
  ResetPasswordInput,
} from '../validation/auth.schema';

const REFRESH_COOKIE_NAME = 'beacon_refresh';

function setRefreshTokenCookie(res: Response, token: string): void {
  res.cookie(REFRESH_COOKIE_NAME, token, {
    httpOnly: true,
    secure: env.isProduction,
    sameSite: env.isProduction ? 'strict' : 'lax',
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    path: '/api/v1/auth',
  });
}

function clearRefreshTokenCookie(res: Response): void {
  res.clearCookie(REFRESH_COOKIE_NAME, {
    httpOnly: true,
    secure: env.isProduction,
    sameSite: env.isProduction ? 'strict' : 'lax',
    path: '/api/v1/auth',
  });
}

export class AuthController {
  static async register(req: Request, res: Response): Promise<void> {
    const userAgent = req.headers['user-agent'];
    const ipAddress = req.ip;

    const input = req.body as RegisterInput;
    const result = await AuthService.register(input, userAgent, ipAddress);
    setRefreshTokenCookie(res, result.refreshToken);

    res.status(201).json({
      success: true,
      data: {
        user: result.user,
        accessToken: result.accessToken,
        refreshToken: result.refreshToken, // Also returned in JSON for non-browser/testing clients
      },
    });
  }

  static async login(req: Request, res: Response): Promise<void> {
    const userAgent = req.headers['user-agent'];
    const ipAddress = req.ip;

    const input = req.body as LoginInput;
    const result = await AuthService.login(input, userAgent, ipAddress);
    setRefreshTokenCookie(res, result.refreshToken);

    res.status(200).json({
      success: true,
      data: {
        user: result.user,
        accessToken: result.accessToken,
        refreshToken: result.refreshToken,
      },
    });
  }

  static async refresh(req: Request, res: Response): Promise<void> {
    const body = req.body as { refreshToken?: string } | undefined;
    const cookies = req.cookies as Record<string, string> | undefined;
    const rawToken = cookies?.[REFRESH_COOKIE_NAME] || body?.refreshToken;

    if (!rawToken) {
      throw new UnauthorizedError('Refresh token required', 'REFRESH_TOKEN_REQUIRED');
    }

    const userAgent = req.headers['user-agent'];
    const ipAddress = req.ip;

    const result = await TokenService.rotateRefreshToken(rawToken, userAgent, ipAddress);
    setRefreshTokenCookie(res, result.refreshToken);

    res.status(200).json({
      success: true,
      data: {
        accessToken: result.accessToken,
        refreshToken: result.refreshToken,
        user: result.user,
      },
    });
  }

  static async logout(req: Request, res: Response): Promise<void> {
    const body = req.body as { refreshToken?: string } | undefined;
    const cookies = req.cookies as Record<string, string> | undefined;
    const rawToken = cookies?.[REFRESH_COOKIE_NAME] || body?.refreshToken;

    if (rawToken) {
      await TokenService.revokeRefreshToken(rawToken);
    }

    clearRefreshTokenCookie(res);

    res.status(200).json({
      success: true,
      message: 'Logged out successfully',
    });
  }

  static async verifyEmail(req: Request, res: Response): Promise<void> {
    const { token } = req.params;
    await AuthService.verifyEmail(token);

    res.status(200).json({
      success: true,
      message: 'Email verified successfully',
    });
  }

  static async forgotPassword(req: Request, res: Response): Promise<void> {
    const { email } = req.body as ForgotPasswordInput;
    await AuthService.forgotPassword(email);

    res.status(200).json({
      success: true,
      message: 'If that email exists in our system, a password reset link has been sent.',
    });
  }

  static async resetPassword(req: Request, res: Response): Promise<void> {
    const { token, password } = req.body as ResetPasswordInput;
    await AuthService.resetPassword(token, password);

    res.status(200).json({
      success: true,
      message: 'Password reset successfully. You may now log in with your new password.',
    });
  }

  static async getMe(req: Request, res: Response): Promise<void> {
    if (!req.user) {
      throw new UnauthorizedError('Unauthorized', 'UNAUTHORIZED');
    }

    const user = await AuthService.getCurrentUser(req.user.userId);

    res.status(200).json({
      success: true,
      data: { user },
    });
  }
}
