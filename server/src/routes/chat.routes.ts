import { Router } from 'express';
import { ChatController } from '../controllers/chat.controller';
import { authenticate } from '../middleware/auth.middleware';
import { validate } from '../middleware/validate';
import { asyncHandler } from '../middleware/errorHandler';
import {
  createDirectChatSchema,
  getMessagesSchema,
  sendMessageSchema,
  markChatAsReadSchema,
} from '../validation/chat.schema';

const router = Router();

// All chat endpoints require authentication
router.use(authenticate);

// List user's chats
router.get(
  '/',
  asyncHandler((req, res) => ChatController.getUserChats(req, res)),
);

// Get or create 1-on-1 direct chat
router.post(
  '/direct',
  validate(createDirectChatSchema),
  asyncHandler((req, res) => ChatController.createDirectChat(req, res)),
);

// Get messages in a chat (paginated)
router.get(
  '/:chatId/messages',
  validate(getMessagesSchema),
  asyncHandler((req, res) => ChatController.getChatMessages(req, res)),
);

// Send message in a chat
router.post(
  '/:chatId/messages',
  validate(sendMessageSchema),
  asyncHandler((req, res) => ChatController.sendMessage(req, res)),
);

// Mark chat as read
router.post(
  '/:chatId/read',
  validate(markChatAsReadSchema),
  asyncHandler((req, res) => ChatController.markAsRead(req, res)),
);

export default router;
