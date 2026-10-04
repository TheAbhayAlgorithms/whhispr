import { Router } from 'express';
import { CallController } from '../controllers/call.controller';
import { authenticate } from '../middleware/auth.middleware';
import { validate } from '../middleware/validate';
import { asyncHandler } from '../middleware/errorHandler';
import { logCallSchema, callHistoryQuerySchema } from '../validation/call.schema';

const router = Router();

// All call endpoints require authentication
router.use(authenticate);

// Get WebRTC ICE servers configuration
router.get(
  '/ice-servers',
  (req, res) => CallController.getIceServers(req, res),
);

// Log call record (completed, missed, rejected, etc.)
router.post(
  '/log',
  validate(logCallSchema),
  asyncHandler((req, res) => CallController.logCall(req, res)),
);

// Get authenticated user's call history
router.get(
  '/history',
  validate(callHistoryQuerySchema),
  asyncHandler((req, res) => CallController.getHistory(req, res)),
);

export default router;
