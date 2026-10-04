import rateLimit from 'express-rate-limit';
import { env } from '../config/env';

/**
 * Strict rate limiter for sensitive authentication endpoints (login, register, forgot-password).
 * Allows 10 requests per 15 minutes in production, relaxed in tests.
 */
export const authRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: env.isTest ? 1000 : 15,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    error: {
      code: 'TOO_MANY_AUTH_ATTEMPTS',
      message: 'Too many authentication attempts. Please try again after 15 minutes.',
    },
  },
});
