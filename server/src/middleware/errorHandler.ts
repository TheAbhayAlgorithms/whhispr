/**
 * middleware/errorHandler.ts
 * Global Express error handler — must be registered last.
 * Formats all thrown errors into a consistent JSON shape.
 */
import { NextFunction, Request, Response } from 'express';
import { ZodError } from 'zod';
import { AppError, ValidationError } from '../utils/errors';
import { logger } from '../utils/logger';

interface ErrorResponse {
  success: false;
  error: {
    code: string;
    message: string;
    fields?: Record<string, string[]>;
    stack?: string;
  };
}

export function errorHandler(err: Error, _req: Request, res: Response, _next: NextFunction): void {
  // ── Zod validation errors ────────────────────────────────────────────────
  if (err instanceof ZodError) {
    const fields: Record<string, string[]> = {};
    for (const issue of err.issues) {
      const key = issue.path.join('.') || 'body';
      fields[key] = fields[key] ?? [];
      fields[key].push(issue.message);
    }
    const body: ErrorResponse = {
      success: false,
      error: { code: 'VALIDATION_ERROR', message: 'Validation failed', fields },
    };
    res.status(422).json(body);
    return;
  }

  // ── Custom operational errors ────────────────────────────────────────────
  if (err instanceof ValidationError) {
    const body: ErrorResponse = {
      success: false,
      error: { code: err.code, message: err.message, fields: err.fields },
    };
    res.status(err.statusCode).json(body);
    return;
  }

  if (err instanceof AppError) {
    const body: ErrorResponse = {
      success: false,
      error: { code: err.code, message: err.message },
    };
    res.status(err.statusCode).json(body);
    return;
  }

  // ── Unknown / programming errors ─────────────────────────────────────────
  logger.error('Unhandled error', { message: err.message, stack: err.stack });

  let clientMessage = err.message || 'An unexpected error occurred';
  if (clientMessage.includes('password authentication failed')) {
    clientMessage =
      'Database connection failed: Invalid password in DATABASE_URL. Please verify your Supabase database password.';
  } else if (
    clientMessage.includes('does not exist') ||
    clientMessage.includes('relation "users"') ||
    clientMessage.includes('relation "profiles"')
  ) {
    clientMessage =
      'Database tables not found. Please paste and run supabase/schema.sql in your Supabase SQL Editor.';
  } else if (clientMessage.includes('DATABASE_URL is not set')) {
    clientMessage =
      'DATABASE_URL is not set in Vercel. Please add your Supabase connection string in Vercel Settings -> Environment Variables and redeploy.';
  }

  const body: ErrorResponse = {
    success: false,
    error: {
      code: 'INTERNAL_ERROR',
      message: clientMessage,
      ...(process.env.NODE_ENV === 'development' ? { stack: err.stack } : {}),
    },
  };
  res.status(500).json(body);
}

/** Catch async route handler errors and forward them to errorHandler */
export function asyncHandler<T extends Request = Request>(
  fn: (req: T, res: Response, next: NextFunction) => Promise<void>,
) {
  return (req: T, res: Response, next: NextFunction): void => {
    fn(req, res, next).catch(next);
  };
}
