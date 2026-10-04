import { Socket } from 'socket.io';
import { TokenService, TokenUserPayload } from '../services/token.service';

export interface AuthenticatedSocket extends Socket {
  data: {
    user: TokenUserPayload;
  };
}

export function socketAuthMiddleware(
  socket: Socket,
  next: (err?: Error) => void,
): void {
  const authRecord = socket.handshake.auth as Record<string, unknown> | undefined;
  const authToken = typeof authRecord?.token === 'string' ? authRecord.token : undefined;
  const authHeader = socket.handshake.headers['authorization'];
  const headerToken =
    typeof authHeader === 'string' ? authHeader.replace(/^Bearer\s+/i, '') : undefined;
  const token = authToken || headerToken;

  if (!token) {
    return next(new Error('Authentication error: No token provided'));
  }

  try {
    const payload = TokenService.verifyAccessToken(token);
    (socket as AuthenticatedSocket).data.user = payload;
    next();
  } catch {
    next(new Error('Authentication error: Invalid or expired token'));
  }
}

