import { Router } from 'express';
import { AuthController } from '../controllers/auth.controller';
import { validate } from '../middleware/validate';
import { authenticate } from '../middleware/auth.middleware';
import { authRateLimiter } from '../middleware/rateLimiter';
import { asyncHandler } from '../middleware/errorHandler';
import {
  registerSchema,
  loginSchema,
  refreshTokenSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
  verifyEmailSchema,
} from '../validation/auth.schema';

const router = Router();

// Public routes
router.post(
  '/register',
  authRateLimiter,
  validate(registerSchema),
  asyncHandler((req, res) => AuthController.register(req, res)),
);

router.post(
  '/login',
  authRateLimiter,
  validate(loginSchema),
  asyncHandler((req, res) => AuthController.login(req, res)),
);

router.post(
  '/refresh',
  validate(refreshTokenSchema),
  asyncHandler((req, res) => AuthController.refresh(req, res)),
);

router.post(
  '/logout',
  asyncHandler((req, res) => AuthController.logout(req, res)),
);

router.post(
  '/forgot-password',
  authRateLimiter,
  validate(forgotPasswordSchema),
  asyncHandler((req, res) => AuthController.forgotPassword(req, res)),
);

router.post(
  '/reset-password',
  authRateLimiter,
  validate(resetPasswordSchema),
  asyncHandler((req, res) => AuthController.resetPassword(req, res)),
);

router.get(
  '/verify-email/:token',
  validate(verifyEmailSchema),
  asyncHandler((req, res) => AuthController.verifyEmail(req, res)),
);

// Protected routes
router.get(
  '/me',
  authenticate,
  asyncHandler((req, res) => AuthController.getMe(req, res)),
);

export default router;
