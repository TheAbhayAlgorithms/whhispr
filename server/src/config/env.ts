/**
 * config/env.ts
 * Centralised, validated environment configuration.
 * All process.env accesses go through here — never elsewhere.
 */
import dotenv from 'dotenv';
import path from 'path';

// Load .env relative to the project root
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

function required(key: string): string {
  const value = process.env[key];
  if (!value) {
    throw new Error(`Missing required environment variable: ${key}`);
  }
  return value;
}

function optional(key: string, fallback: string): string {
  return process.env[key] ?? fallback;
}

export const env = {
  NODE_ENV: optional('NODE_ENV', 'development'),
  PORT: parseInt(optional('PORT', '4000'), 10),
  CLIENT_URL: optional('CLIENT_URL', 'http://localhost:3000'),

  // Database
  DATABASE_URL: required('DATABASE_URL'),
  DB_HOST: optional('DB_HOST', 'localhost'),
  DB_PORT: parseInt(optional('DB_PORT', '5432'), 10),
  DB_NAME: optional('DB_NAME', 'beacon'),
  DB_USER: optional('DB_USER', 'beacon_user'),
  DB_PASSWORD: optional('DB_PASSWORD', 'beacon_secret'),

  // Redis
  REDIS_URL: optional('REDIS_URL', 'redis://localhost:6379'),

  // JWT
  JWT_ACCESS_SECRET: required('JWT_ACCESS_SECRET'),
  JWT_REFRESH_SECRET: required('JWT_REFRESH_SECRET'),
  JWT_ACCESS_EXPIRES_IN: optional('JWT_ACCESS_EXPIRES_IN', '15m'),
  JWT_REFRESH_EXPIRES_IN: optional('JWT_REFRESH_EXPIRES_IN', '7d'),

  // Email
  SMTP_HOST: optional('SMTP_HOST', ''),
  SMTP_PORT: parseInt(optional('SMTP_PORT', '587'), 10),
  SMTP_USER: optional('SMTP_USER', ''),
  SMTP_PASS: optional('SMTP_PASS', ''),
  EMAIL_FROM: optional('EMAIL_FROM', 'no-reply@beacon.chat'),

  // Storage
  STORAGE_DRIVER: optional('STORAGE_DRIVER', 'local') as 'local' | 's3',
  LOCAL_UPLOAD_DIR: optional('LOCAL_UPLOAD_DIR', 'uploads'),
  AWS_ACCESS_KEY_ID: optional('AWS_ACCESS_KEY_ID', ''),
  AWS_SECRET_ACCESS_KEY: optional('AWS_SECRET_ACCESS_KEY', ''),
  AWS_REGION: optional('AWS_REGION', 'us-east-1'),
  AWS_S3_BUCKET: optional('AWS_S3_BUCKET', 'beacon-media'),

  // Rate limiting
  RATE_LIMIT_WINDOW_MS: parseInt(optional('RATE_LIMIT_WINDOW_MS', '900000'), 10),
  RATE_LIMIT_MAX: parseInt(optional('RATE_LIMIT_MAX', '100'), 10),

  // Web Push VAPID keys
  VAPID_PUBLIC_KEY: optional(
    'VAPID_PUBLIC_KEY',
    'BEl62iUYgUivxIkv69yViEuiBIa-Ib9-SkvMeAtA3LFgDzkrxZJjSgSnfckjBJuBkr3qBUYIHBQFLXYp5Nksh8U',
  ),
  VAPID_PRIVATE_KEY: optional(
    'VAPID_PRIVATE_KEY',
    'uu4G0F3qDqK_u_vA6K5B3f2bJ6n3j2K_6a8m8y6h8_Q',
  ),
  VAPID_SUBJECT: optional('VAPID_SUBJECT', 'mailto:admin@beacon.chat'),

  // Helpers
  isProduction: optional('NODE_ENV', 'development') === 'production',
  isDevelopment: optional('NODE_ENV', 'development') === 'development',
  isTest: optional('NODE_ENV', 'development') === 'test',
} as const;
