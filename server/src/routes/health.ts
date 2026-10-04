/**
 * routes/health.ts
 * Health-check endpoint — used by Docker, load balancers, and monitoring.
 * GET /api/health → { status, db, redis, uptime, version }
 */
import { Router, Request, Response } from 'express';
import { checkDatabaseHealth } from '../config/database';
import { checkRedisHealth } from '../config/redis';
import { asyncHandler } from '../middleware/errorHandler';

const router = Router();

router.get(
  '/',
  asyncHandler(async (_req: Request, res: Response): Promise<void> => {
    const [db, redisOk] = await Promise.all([checkDatabaseHealth(), checkRedisHealth()]);

    const healthy = db && redisOk;

    const body = {
      status: healthy ? 'ok' : 'degraded',
      timestamp: new Date().toISOString(),
      uptime: Math.round(process.uptime()),
      version: process.env.npm_package_version ?? '1.0.0',
      services: {
        database: db ? 'ok' : 'error',
        redis: redisOk ? 'ok' : 'error',
      },
    };

    // 200 when healthy, 503 when degraded (so load balancers stop routing)
    res.status(healthy ? 200 : 503).json(body);
  }),
);

export default router;
