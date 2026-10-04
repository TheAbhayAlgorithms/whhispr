/**
 * services/cache.service.ts
 * Centralized Redis caching service for high-throughput reads,
 * session caching, and query result memoization.
 */
import redis from '../config/redis';
import { env } from '../config/env';
import { logger } from '../utils/logger';

export class CacheService {
  /**
   * Retrieve a parsed JSON value from Redis.
   */
  static async get<T>(key: string): Promise<T | null> {
    if (env.isTest) return null;
    try {
      const data = await redis.get(key);
      if (!data) return null;
      return JSON.parse(data) as T;
    } catch (err: unknown) {
      logger.warn('[CacheService] Failed to read key', {
        key,
        error: err instanceof Error ? err.message : String(err),
      });
      return null;
    }
  }

  /**
   * Set a JSON-serializable value in Redis with optional TTL in seconds.
   */
  static async set(key: string, value: unknown, ttlSeconds = 300): Promise<void> {
    if (env.isTest) return;
    try {
      const serialized = JSON.stringify(value);
      if (ttlSeconds > 0) {
        await redis.setex(key, ttlSeconds, serialized);
      } else {
        await redis.set(key, serialized);
      }
    } catch (err: unknown) {
      logger.warn('[CacheService] Failed to write key', {
        key,
        error: err instanceof Error ? err.message : String(err),
      });
    }
  }

  /**
   * Invalidate one or more exact keys.
   */
  static async del(...keys: string[]): Promise<void> {
    if (!keys || keys.length === 0) return;
    try {
      await redis.del(...keys);
    } catch (err: unknown) {
      logger.warn('[CacheService] Failed to delete keys', {
        keys,
        error: err instanceof Error ? err.message : String(err),
      });
    }
  }

  /**
   * Invalidate keys matching a pattern (e.g. "profile:*").
   */
  static async delPattern(pattern: string): Promise<void> {
    try {
      const keys = await redis.keys(pattern);
      if (keys.length > 0) {
        await redis.del(...keys);
      }
    } catch (err: unknown) {
      logger.warn('[CacheService] Failed to invalidate pattern', {
        pattern,
        error: err instanceof Error ? err.message : String(err),
      });
    }
  }

  /**
   * Cache-aside helper: returns cached value or executes fetcher and caches result.
   */
  static async getOrSet<T>(
    key: string,
    fetcher: () => Promise<T>,
    ttlSeconds = 300,
  ): Promise<T> {
    if (env.isTest) return fetcher();
    const cached = await this.get<T>(key);
    if (cached !== null && cached !== undefined) {
      return cached;
    }

    const fresh = await fetcher();
    if (fresh !== null && fresh !== undefined) {
      await this.set(key, fresh, ttlSeconds);
    }
    return fresh;
  }
}
