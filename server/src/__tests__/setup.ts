/**
 * __tests__/setup.ts
 * Global Jest setup — runs once before all test suites.
 */
export default function globalSetup(): void {
  // Make test env vars available (Jest doesn't load .env automatically)
  process.env.NODE_ENV = 'test';
  process.env.DATABASE_URL =
    process.env.DATABASE_URL ?? 'postgres://beacon_user:beacon_secret@localhost:5432/beacon';
  process.env.REDIS_URL = process.env.REDIS_URL ?? 'redis://localhost:6379';
  process.env.JWT_ACCESS_SECRET = 'test_access_secret_at_least_32_chars_long';
  process.env.JWT_REFRESH_SECRET = 'test_refresh_secret_at_least_32_chars_long';
}
