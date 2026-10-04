import { Router } from 'express';
import { ChatController } from '../controllers/chat.controller';
import { authenticate } from '../middleware/auth.middleware';
import { validate } from '../middleware/validate';
import { asyncHandler } from '../middleware/errorHandler';
import { toggleReactionSchema, editMessageSchema, deleteMessageSchema } from '../validation/chat.schema';

const router = Router();

// All message routes require authentication
router.use(authenticate);

// Edit message (author only, within 15 mins)
router.patch(
  '/:messageId',
  validate(editMessageSchema),
  asyncHandler((req, res) => ChatController.editMessage(req, res)),
);

// Delete message (mode: 'me' or 'everyone')
router.delete(
  '/:messageId',
  validate(deleteMessageSchema),
  asyncHandler((req, res) => ChatController.deleteMessage(req, res)),
);

// Toggle reaction on a message
router.post(
  '/:messageId/reactions',
  validate(toggleReactionSchema),
  asyncHandler((req, res) => ChatController.toggleReaction(req, res)),
);

export default router;

