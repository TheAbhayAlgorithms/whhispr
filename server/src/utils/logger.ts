/**
 * utils/logger.ts
 * Lightweight structured logger.
 * In production wire this to a service like Datadog/Logtail.
 */
import { env } from '../config/env';

type LogLevel = 'debug' | 'info' | 'warn' | 'error';

function log(level: LogLevel, message: string, meta?: Record<string, unknown>): void {
  if (env.isTest && level !== 'error') return; // silence noise in tests

  const entry = {
    timestamp: new Date().toISOString(),
    level,
    message,
    ...(meta ? { meta } : {}),
  };

  const output = env.isProduction ? JSON.stringify(entry) : formatDev(entry);

  if (level === 'error') {
    console.error(output);
  } else if (level === 'warn') {
    console.warn(output);
  } else {
    console.info(output);
  }
}

function formatDev(entry: Record<string, unknown>): string {
  const { timestamp, level, message, meta } = entry as {
    timestamp: string;
    level: string;
    message: string;
    meta?: Record<string, unknown>;
  };
  const color: Record<string, string> = {
    debug: '\x1b[36m',
    info: '\x1b[32m',
    warn: '\x1b[33m',
    error: '\x1b[31m',
  };
  const reset = '\x1b[0m';
  const metaStr = meta ? ` ${JSON.stringify(meta)}` : '';
  return `${color[level]}[${level.toUpperCase()}]${reset} ${timestamp} — ${message}${metaStr}`;
}

export const logger = {
  debug: (msg: string, meta?: Record<string, unknown>) => log('debug', msg, meta),
  info: (msg: string, meta?: Record<string, unknown>) => log('info', msg, meta),
  warn: (msg: string, meta?: Record<string, unknown>) => log('warn', msg, meta),
  error: (msg: string, meta?: Record<string, unknown>) => log('error', msg, meta),
};
