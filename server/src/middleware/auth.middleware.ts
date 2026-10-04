import { Request, Response, NextFunction } from 'express';
import { UnauthorizedError, ForbiddenError } from '../utils/errors';
import { TokenService } from '../services/token.service';
import { query } from '../config/database';

export function authenticate(req: Request, _res: Response, next: NextFunction): void {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return next(
      new UnauthorizedError('Missing or malformed Authorization header', 'AUTH_REQUIRED'),
    );
  }

  const token = authHeader.split(' ')[1];
  try {
    const payload = TokenService.verifyAccessToken(token);

    // Verify user is still active in database
    query<{ is_active: boolean }>(`SELECT is_active FROM users WHERE id = $1 LIMIT 1`, [
      payload.userId,
    ])
      .then(({ rows: users }) => {
        if (users.length === 0 || !users[0].is_active) {
          return next(
            new UnauthorizedError('Account is inactive or does not exist', 'USER_INACTIVE'),
          );
        }

        req.user = payload;
        next();
      })
      .catch(next);
  } catch (err) {
    next(err);
  }
}

export function requireRole(...allowedRoles: string[]) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    if (!req.user) {
      return next(new UnauthorizedError('Authentication required', 'AUTH_REQUIRED'));
    }

    if (!allowedRoles.includes(req.user.role)) {
      return next(
        new ForbiddenError('You do not have permission to perform this action', 'FORBIDDEN'),
      );
    }

    next();
  };
}
