import { Router } from 'express';
import { ContactController } from '../controllers/contact.controller';
import { authenticate } from '../middleware/auth.middleware';
import { validate } from '../middleware/validate';
import { asyncHandler } from '../middleware/errorHandler';
import {
  sendContactRequestSchema,
  respondContactRequestSchema,
  removeContactSchema,
} from '../validation/contact.schema';

const router = Router();

// All contact endpoints require authentication
router.use(authenticate);

// List all accepted contacts
router.get(
  '/',
  asyncHandler((req, res) => ContactController.getContacts(req, res)),
);

// List pending contact requests (incoming and outgoing)
router.get(
  '/requests',
  asyncHandler((req, res) => ContactController.getPendingRequests(req, res)),
);

// Send a contact request
router.post(
  '/requests',
  validate(sendContactRequestSchema),
  asyncHandler((req, res) => ContactController.sendRequest(req, res)),
);

// Respond to an incoming contact request (accept or reject)
router.post(
  '/requests/:requestId/respond',
  validate(respondContactRequestSchema),
  asyncHandler((req, res) => ContactController.respondToRequest(req, res)),
);

// Remove an accepted contact
router.delete(
  '/:targetUserId',
  validate(removeContactSchema),
  asyncHandler((req, res) => ContactController.removeContact(req, res)),
);

export default router;
