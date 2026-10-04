import { Request, Response } from 'express';
import { SettingsService } from '../services/settings.service';
import { UnauthorizedError } from '../utils/errors';
import { ChangePasswordInput, DeleteAccountInput } from '../validation/settings.schema';
import { env } from '../config/env';

const REFRESH_COOKIE_NAME = 'beacon_refresh';

function clearRefreshTokenCookie(res: Response): void {
  res.clearCookie(REFRESH_COOKIE_NAME, {
    httpOnly: true,
    secure: env.isProduction,
    sameSite: env.isProduction ? 'strict' : 'lax',
    path: '/api/v1/auth',
  });
}

export class SettingsController {
  static async changePassword(req: Request, res: Response): Promise<void> {
    if (!req.user) throw new UnauthorizedError('Unauthorized');
    const input = req.body as ChangePasswordInput;

    const cookies = req.cookies as Record<string, string> | undefined;
    const body = req.body as { refreshToken?: string } | undefined;
    const rawToken = cookies?.[REFRESH_COOKIE_NAME] || body?.refreshToken;

    await SettingsService.changePassword(req.user.userId, input, rawToken);

    res.status(200).json({
      success: true,
      message: 'Password updated successfully',
    });
  }

  static async deleteAccount(req: Request, res: Response): Promise<void> {
    if (!req.user) throw new UnauthorizedError('Unauthorized');
    const input = req.body as DeleteAccountInput;

    await SettingsService.deleteAccount(req.user.userId, input);
    clearRefreshTokenCookie(res);

    res.status(200).json({
      success: true,
      message: 'Account deleted successfully',
    });
  }

  static async listSessions(req: Request, res: Response): Promise<void> {
    if (!req.user) throw new UnauthorizedError('Unauthorized');

    const cookies = req.cookies as Record<string, string> | undefined;
    const rawToken = cookies?.[REFRESH_COOKIE_NAME] || (req.headers['x-refresh-token'] as string);

    const sessions = await SettingsService.listSessions(req.user.userId, rawToken);

    res.status(200).json({
      success: true,
      data: { sessions },
    });
  }

  static async revokeSession(req: Request, res: Response): Promise<void> {
    if (!req.user) throw new UnauthorizedError('Unauthorized');
    const { sessionId } = req.params;

    await SettingsService.revokeSession(req.user.userId, sessionId);

    res.status(200).json({
      success: true,
      message: 'Session revoked successfully',
    });
  }

  static async revokeOtherSessions(req: Request, res: Response): Promise<void> {
    if (!req.user) throw new UnauthorizedError('Unauthorized');

    const cookies = req.cookies as Record<string, string> | undefined;
    const rawToken = cookies?.[REFRESH_COOKIE_NAME] || (req.headers['x-refresh-token'] as string);

    const count = await SettingsService.revokeOtherSessions(req.user.userId, rawToken);

    res.status(200).json({
      success: true,
      message: `Revoked ${count} other active session(s)`,
    });
  }
}
