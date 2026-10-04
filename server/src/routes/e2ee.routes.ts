import { Router } from 'express';
import { E2eeController } from '../controllers/e2ee.controller';
import { authenticate } from '../middleware/auth.middleware';
import { validate } from '../middleware/validate';
import { asyncHandler } from '../middleware/errorHandler';
import {
  registerKeysSchema,
  replenishKeysSchema,
  prekeyBundleParamsSchema,
} from '../validation/e2ee.schema';

const router = Router();

// All E2EE endpoints require authentication
router.use(authenticate);

// Register user's initial cryptographic key bundle (Identity, Signed Prekey, OTPKs)
router.post(
  '/keys',
  validate(registerKeysSchema),
  asyncHandler((req, res) => E2eeController.registerKeys(req, res)),
);

// Fetch Prekey Bundle for a user to initiate an X3DH E2EE session
router.get(
  '/bundle/:userId',
  validate(prekeyBundleParamsSchema),
  asyncHandler((req, res) => E2eeController.getBundle(req, res)),
);

// Get count of remaining unused one-time prekeys
router.get(
  '/keys/count',
  asyncHandler((req, res) => E2eeController.getUnusedCount(req, res)),
);

// Replenish one-time prekeys when pool is low
router.post(
  '/keys/replenish',
  validate(replenishKeysSchema),
  asyncHandler((req, res) => E2eeController.replenishKeys(req, res)),
);

export default router;
