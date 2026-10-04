import { Router } from 'express';
import { SettingsController } from '../controllers/settings.controller';
import { authenticate } from '../middleware/auth.middleware';
import { validate } from '../middleware/validate';
import { asyncHandler } from '../middleware/errorHandler';
import { changePasswordSchema, deleteAccountSchema } from '../validation/settings.schema';

const router = Router();

// All settings routes require authentication
router.use(authenticate);

// Password update
router.patch(
  '/password',
  validate(changePasswordSchema),
  asyncHandler((req, res) => SettingsController.changePassword(req, res)),
);

// Account deletion
router.delete(
  '/account',
  validate(deleteAccountSchema),
  asyncHandler((req, res) => SettingsController.deleteAccount(req, res)),
);

// Session management
router.get(
  '/sessions',
  asyncHandler((req, res) => SettingsController.listSessions(req, res)),
);

router.delete(
  '/sessions',
  asyncHandler((req, res) => SettingsController.revokeOtherSessions(req, res)),
);

router.delete(
  '/sessions/:sessionId',
  asyncHandler((req, res) => SettingsController.revokeSession(req, res)),
);

export default router;
