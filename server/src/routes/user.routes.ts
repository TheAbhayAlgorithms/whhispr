import { Router } from 'express';
import { UserController } from '../controllers/user.controller';
import { authenticate } from '../middleware/auth.middleware';
import { validate } from '../middleware/validate';
import { uploadAvatarMiddleware } from '../middleware/upload';
import { asyncHandler } from '../middleware/errorHandler';
import {
  updateProfileSchema,
  searchUsersSchema,
  getUserProfileSchema,
} from '../validation/user.schema';

const router = Router();

// All user/profile routes require authentication
router.use(authenticate);

// Personal profile management
router.get(
  '/profile/me',
  asyncHandler((req, res) => UserController.getMyProfile(req, res)),
);

router.patch(
  '/profile/me',
  validate(updateProfileSchema),
  asyncHandler((req, res) => UserController.updateProfile(req, res)),
);

router.post(
  '/profile/avatar',
  uploadAvatarMiddleware.single('avatar'),
  asyncHandler((req, res) => UserController.uploadAvatar(req, res)),
);

router.delete(
  '/profile/avatar',
  asyncHandler((req, res) => UserController.removeAvatar(req, res)),
);

// User search
router.get(
  '/search',
  validate(searchUsersSchema),
  asyncHandler((req, res) => UserController.searchUsers(req, res)),
);

// Public profile of another user
router.get(
  '/:id/profile',
  validate(getUserProfileSchema),
  asyncHandler((req, res) => UserController.getPublicProfile(req, res)),
);

export default router;
