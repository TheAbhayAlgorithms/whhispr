import { Router } from 'express';
import { SearchController } from '../controllers/search.controller';
import { authenticate } from '../middleware/auth.middleware';
import { validate } from '../middleware/validate';
import { asyncHandler } from '../middleware/errorHandler';
import {
  searchAllSchema,
  searchMessagesSchema,
  searchUsersSchema,
  searchChatsSchema,
} from '../validation/search.schema';

const router = Router();

// All search endpoints require authentication
router.use(authenticate);

// Unified global search across messages, users, and channels
router.get(
  '/',
  validate(searchAllSchema),
  asyncHandler((req, res) => SearchController.searchAll(req, res)),
);

// Search messages (with optional chatId filter for in-chat search, senderId, hasMedia, pagination)
router.get(
  '/messages',
  validate(searchMessagesSchema),
  asyncHandler((req, res) => SearchController.searchMessages(req, res)),
);

// Search users
router.get(
  '/users',
  validate(searchUsersSchema),
  asyncHandler((req, res) => SearchController.searchUsers(req, res)),
);

// Search chats and public channels
router.get(
  '/chats',
  validate(searchChatsSchema),
  asyncHandler((req, res) => SearchController.searchChats(req, res)),
);

export default router;
