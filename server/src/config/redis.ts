/**
 * config/redis.ts
 * Single shared ioredis client used for caching, pub/sub,
 * presence tracking, and the Socket.IO Redis adapter.
 */
import { Redis } from 'ioredis';
import { env } from './env';

// Primary client — general purpose
const redis = new Redis(env.REDIS_URL, {
  maxRetriesPerRequest: 3,
  retryStrategy: (times) => Math.min(times * 50, 2_000),
  enableOfflineQueue: false,
  lazyConnect: true,
});

if (env.NODE_ENV !== 'test') {
  redis.on('connect', () => console.info('[Redis] Connected'));
  redis.on('error', (err: Error) => console.error('[Redis] Error:', err.message));
}

/** Verify Redis is reachable — used by the health-check endpoint. */
export async function checkRedisHealth(): Promise<boolean> {
  try {
    if (redis.status === 'wait') {
      await redis.connect();
    }
    const pong = await redis.ping();
    return pong === 'PONG';
  } catch {
    return false;
  }
}

/**
 * Create a *separate* ioredis instance for pub/sub.
 * A subscribed client cannot issue regular commands.
 */
export function createRedisClient(): Redis {
  const client = new Redis(env.REDIS_URL, {
    maxRetriesPerRequest: 3,
    retryStrategy: (times) => Math.min(times * 50, 2_000),
    enableOfflineQueue: true,
  });
  client.on('error', (err: Error) => {
    if (env.NODE_ENV !== 'test') {
      console.error('[Redis PubSub] Error:', err.message);
    }
  });
  return client;
}

export default redis;
