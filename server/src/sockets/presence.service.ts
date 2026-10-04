import redis from '../config/redis';
import { query } from '../config/database';
import { logger } from '../utils/logger';

export interface UserPresence {
  userId: string;
  status: 'online' | 'offline';
  lastSeen: string | null;
}

export class PresenceService {
  private static getKey(userId: string): string {
    return `presence:${userId}`;
  }

  /**
   * Marks user as online. Tracks active socket count for multi-device support.
   * Returns true if user just transitioned from offline to online.
   */
  static async setUserOnline(userId: string): Promise<boolean> {
    try {
      const key = this.getKey(userId);
      const now = new Date().toISOString();

      const exists = await redis.exists(key);
      if (!exists) {
        await redis.hset(key, {
          status: 'online',
          socketCount: '1',
          lastSeen: now,
        });
        await redis.expire(key, 86400); // 24 hour fallback TTL
        return true;
      } else {
        await redis.hincrby(key, 'socketCount', 1);
        await redis.hset(key, 'status', 'online');
        await redis.expire(key, 86400);
        return false;
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      logger.warn('Failed to update presence in Redis', { userId, error: msg });
      return false;
    }
  }

  /**
   * Decrements user socket count on disconnect.
   * Returns true if user has no remaining active sockets (transitioned to offline).
   */
  static async setUserOffline(userId: string): Promise<boolean> {
    try {
      const key = this.getKey(userId);
      const count = await redis.hincrby(key, 'socketCount', -1);
      if (count <= 0) {
        await redis.del(key);

        // Update database profiles last_seen
        await query(
          `UPDATE profiles SET last_seen = NOW() WHERE user_id = $1`,
          [userId],
        ).catch((err: Error) => {
          logger.warn('Failed to persist last_seen in DB', { userId, error: err.message });
        });

        return true;
      }

      return false;
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      logger.warn('Failed to set user offline in Redis', { userId, error: msg });
      return false;
    }
  }

  /**
   * Retrieves presence status for a given user.
   */
  static async getUserPresence(userId: string): Promise<UserPresence> {
    try {
      const key = this.getKey(userId);
      const data = await redis.hgetall(key);

      if (data && data.status === 'online') {
        return {
          userId,
          status: 'online',
          lastSeen: data.lastSeen || null,
        };
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      logger.warn('Error reading presence from Redis', { userId, error: msg });
    }

    // Fallback to database last_seen
    try {
      const { rows } = await query<{ last_seen: Date | null }>(
        `SELECT last_seen FROM profiles WHERE user_id = $1`,
        [userId],
      );

      return {
        userId,
        status: 'offline',
        lastSeen: rows[0]?.last_seen ? rows[0].last_seen.toISOString() : null,
      };
    } catch {
      return {
        userId,
        status: 'offline',
        lastSeen: null,
      };
    }
  }
}
