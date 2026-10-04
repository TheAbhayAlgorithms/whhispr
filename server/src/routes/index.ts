/**
 * routes/index.ts
 * Central router — mounts all feature routes under /api/v1
 */
import { Router } from 'express';
import healthRouter from './health';
import authRouter from './auth.routes';
import userRouter from './user.routes';
import contactRouter from './contact.routes';
import chatRouter from './chat.routes';
import groupRouter from './group.routes';
import mediaRouter from './media.routes';
import messageRouter from './message.routes';
import searchRouter from './search.routes';
import callRouter from './call.routes';
import e2eeRouter from './e2ee.routes';
import notificationRouter from './notification.routes';
import settingsRouter from './settings.routes';
import docsRouter from './docs.routes';

const router = Router();

// Health check (no version prefix — infra uses this)
router.use('/health', healthRouter);

// v1 API routes
router.use('/v1/auth', authRouter);
router.use('/v1/users', userRouter);
router.use('/v1/contacts', contactRouter);
router.use('/v1/chats', chatRouter);
router.use('/v1/groups', groupRouter);
router.use('/v1/media', mediaRouter);
router.use('/v1/messages', messageRouter);
router.use('/v1/search', searchRouter);
router.use('/v1/calls', callRouter);
router.use('/v1/e2ee', e2eeRouter);
router.use('/v1/notifications', notificationRouter);
router.use('/v1/settings', settingsRouter);

// API Documentation (Swagger UI & OpenAPI)
router.use('/docs', docsRouter);

export default router;

