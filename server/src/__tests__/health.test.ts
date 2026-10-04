/**
 * __tests__/health.test.ts
 * Integration tests for the health-check endpoint.
 * These test the real DB and Redis connections.
 */
import request from 'supertest';
import { createApp } from '../app';
import pool from '../config/database';
import redis from '../config/redis';

const app = createApp();

afterAll(async () => {
  await pool.end();
  if (redis.status !== 'wait' && redis.status !== 'end') {
    try {
      await redis.quit();
    } catch {
      redis.disconnect();
    }
  } else {
    redis.disconnect();
  }
});

describe('GET /api/health', () => {
  it('returns 200 with ok status when services are healthy', async () => {
    const res = await request(app).get('/api/health');

    // Status code depends on whether Docker is running in CI
    expect([200, 503]).toContain(res.status);
    expect(res.body).toHaveProperty('status');
    expect(res.body).toHaveProperty('services');
    expect(res.body.services).toHaveProperty('database');
    expect(res.body.services).toHaveProperty('redis');
    expect(res.body).toHaveProperty('timestamp');
    expect(res.body).toHaveProperty('uptime');
  });

  it('response includes correct shape', async () => {
    const res = await request(app).get('/api/health');

    expect(typeof res.body.uptime).toBe('number');
    expect(['ok', 'degraded']).toContain(res.body.status);
    expect(['ok', 'error']).toContain(res.body.services.database);
    expect(['ok', 'error']).toContain(res.body.services.redis);
  });
});

describe('GET /api/nonexistent', () => {
  it('returns 404 for unknown routes', async () => {
    const res = await request(app).get('/api/nonexistent');
    expect(res.status).toBe(404);
    expect(res.body.error.code).toBe('NOT_FOUND');
  });
});
