/**
 * index.ts
 * Server entry point — binds the Express app to a port and
 * initialises Socket.IO + Redis connections.
 */
import http from 'http';
import { createApp } from './app';
import { env } from './config/env';
import { logger } from './utils/logger';
import redis from './config/redis';
import pool from './config/database';

import { initSocketIO, closeSocketIO } from './sockets';

async function bootstrap(): Promise<void> {
  // Eagerly connect Redis so health-check is accurate from the first request
  await redis.connect().catch((err: Error) => {
    logger.warn('Redis connection failed at startup — will retry', { error: err.message });
  });

  const app = createApp();
  const httpServer = http.createServer(app);

  // Initialize Socket.IO with Redis adapter and authentication
  initSocketIO(httpServer);

  httpServer.listen(env.PORT, () => {
    logger.info(`🚀 Whhispr server running`, {
      port: env.PORT,
      env: env.NODE_ENV,
      pid: process.pid,
    });
  });

  // ── Graceful shutdown ──────────────────────────────────────────────────
  const shutdown = (signal: string): void => {
    logger.info(`Received ${signal} — shutting down gracefully`);
    httpServer.close(() => {
      void (async () => {
        await closeSocketIO();
        await redis.quit();
        await pool.end();
        logger.info('All connections closed. Bye!');
        process.exit(0);
      })();
    });

    // Force-kill after 10 s if graceful shutdown hangs
    setTimeout(() => {
      logger.error('Forced shutdown after timeout');
      process.exit(1);
    }, 10_000);
  };

  process.on('SIGTERM', () => void shutdown('SIGTERM'));
  process.on('SIGINT', () => void shutdown('SIGINT'));

  // Log unhandled promise rejections — don't silently swallow them
  process.on('unhandledRejection', (reason) => {
    logger.error('Unhandled promise rejection', { reason: String(reason) });
  });
}

bootstrap().catch((err: Error) => {
  logger.error('Fatal startup error', { message: err.message, stack: err.stack });
  process.exit(1);
});
