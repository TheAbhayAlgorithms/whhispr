/**
 * app.ts
 * Express application factory — separated from server startup so it
 * can be imported by tests without binding to a port.
 */
import express, { Application, Request, Response, NextFunction } from 'express';
import helmet from 'helmet';
import cors from 'cors';
import compression from 'compression';
import cookieParser from 'cookie-parser';
import morgan from 'morgan';
import rateLimit from 'express-rate-limit';

import { env } from './config/env';
import { errorHandler } from './middleware/errorHandler';
import apiRouter from './routes/index';

export function createApp(): Application {
  const app = express();

  // ── Security headers ───────────────────────────────────────────────────
  app.use(
    helmet({
      crossOriginResourcePolicy: { policy: 'cross-origin' }, // allow media
    }),
  );

  // ── CORS ───────────────────────────────────────────────────────────────
  app.use(
    cors({
      origin: (origin, callback) => {
        // Allow requests with no origin (e.g. mobile apps, curl, health checks)
        if (!origin) return callback(null, true);
        if (
          !env.isProduction ||
          origin === env.CLIENT_URL ||
          origin.endsWith('.vercel.app') ||
          origin.includes('localhost')
        ) {
          return callback(null, true);
        }
        return callback(null, true);
      },
      credentials: true, // allow cookies/auth headers
      methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization'],
    }),
  );

  // ── Body parsing ───────────────────────────────────────────────────────
  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ extended: true, limit: '10mb' }));
  app.use(cookieParser());

  // ── Compression ────────────────────────────────────────────────────────
  app.use(compression());

  // ── HTTP request logging ───────────────────────────────────────────────
  if (!env.isTest) {
    app.use(morgan(env.isProduction ? 'combined' : 'dev'));
  }

  // ── Global rate limiter ────────────────────────────────────────────────
  // Auth routes have their own stricter limiter defined in the auth router.
  app.use(
    '/api',
    rateLimit({
      windowMs: env.RATE_LIMIT_WINDOW_MS,
      max: env.RATE_LIMIT_MAX,
      standardHeaders: true,
      legacyHeaders: false,
      skip: (req) => req.path.startsWith('/health') || req.path.startsWith('/docs'),
      message: {
        success: false,
        error: { code: 'TOO_MANY_REQUESTS', message: 'Too many requests' },
      },
    }),
  );

  // ── Serve uploaded files in development ────────────────────────────────
  if (env.isDevelopment) {
    app.use(
      '/uploads',
      express.static(env.LOCAL_UPLOAD_DIR, {
        maxAge: '7d',
        etag: true,
        lastModified: true,
        immutable: true,
      }),
    );
  }

  // ── API routes ─────────────────────────────────────────────────────────
  app.use('/api', apiRouter);

  // ── 404 handler ────────────────────────────────────────────────────────
  app.use((_req: Request, res: Response) => {
    res
      .status(404)
      .json({ success: false, error: { code: 'NOT_FOUND', message: 'Route not found' } });
  });

  // ── Global error handler (must be last) ────────────────────────────────
  app.use((err: Error, req: Request, res: Response, next: NextFunction) => {
    errorHandler(err, req, res, next);
  });

  return app;
}
