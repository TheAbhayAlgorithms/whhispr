import request from 'supertest';
import { createApp } from '../app';
import pool from '../config/database';
import redis from '../config/redis';

const app = createApp();

jest.setTimeout(15000);

beforeAll(async () => {
  await pool.query('DELETE FROM refresh_tokens');
});

afterAll(async () => {
  await pool.end();
  try {
    if (redis.status === 'ready') {
      await redis.quit();
    } else {
      redis.disconnect();
    }
  } catch {
    // Ignore teardown errors
  }
});

describe('Auth Module Integration Tests', () => {
  const testUser = {
    username: 'testuser_' + Date.now(),
    email: `test_${Date.now()}@beacon.chat`,
    password: 'Password123!',
    displayName: 'Test User',
  };

  let accessToken = '';
  let refreshToken = '';
  let authCookie = '';

  describe('POST /api/v1/auth/register', () => {
    it('successfully registers a new user', async () => {
      const res = await request(app).post('/api/v1/auth/register').send(testUser);

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.user).toHaveProperty('id');
      expect(res.body.data.user.email).toBe(testUser.email.toLowerCase());
      expect(res.body.data.user.username).toBe(testUser.username.toLowerCase());
      expect(res.body.data.user.displayName).toBe(testUser.displayName);
      expect(res.body.data).toHaveProperty('accessToken');
      expect(res.body.data).toHaveProperty('refreshToken');

      // Check cookie
      const cookies = res.headers['set-cookie'] as unknown as string[];
      expect(cookies).toBeDefined();
      expect(cookies.some((c) => c.includes('beacon_refresh'))).toBe(true);

      accessToken = res.body.data.accessToken as string;
      refreshToken = res.body.data.refreshToken as string;
      authCookie = cookies.find((c) => c.includes('beacon_refresh')) ?? '';
    });

    it('fails with 409 when registering duplicate email', async () => {
      const res = await request(app)
        .post('/api/v1/auth/register')
        .send({
          ...testUser,
          username: 'different_user_' + Date.now(),
        });

      expect(res.status).toBe(409);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('EMAIL_TAKEN');
    });

    it('fails with 409 when registering duplicate username', async () => {
      const res = await request(app)
        .post('/api/v1/auth/register')
        .send({
          ...testUser,
          email: `different_${Date.now()}@beacon.chat`,
        });

      expect(res.status).toBe(409);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('USERNAME_TAKEN');
    });

    it('fails with 422 on weak password', async () => {
      const res = await request(app).post('/api/v1/auth/register').send({
        username: 'weakpwuser',
        email: 'weak@beacon.chat',
        password: 'simple',
      });

      expect(res.status).toBe(422);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
    });
  });

  describe('POST /api/v1/auth/login', () => {
    it('logs in successfully using email', async () => {
      const res = await request(app).post('/api/v1/auth/login').send({
        identifier: testUser.email,
        password: testUser.password,
      });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.user.email).toBe(testUser.email.toLowerCase());
      expect(res.body.data).toHaveProperty('accessToken');
    });

    it('logs in successfully using username', async () => {
      const res = await request(app).post('/api/v1/auth/login').send({
        identifier: testUser.username,
        password: testUser.password,
      });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.user.username).toBe(testUser.username.toLowerCase());
    });

    it('fails with 401 when password is wrong', async () => {
      const res = await request(app).post('/api/v1/auth/login').send({
        identifier: testUser.email,
        password: 'WrongPassword123!',
      });

      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('INVALID_CREDENTIALS');
    });

    it('fails with 401 when user does not exist', async () => {
      const res = await request(app).post('/api/v1/auth/login').send({
        identifier: 'nonexistent_user_beacon',
        password: 'Password123!',
      });

      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
    });
  });

  describe('Protected route GET /api/v1/auth/me', () => {
    it('returns current user profile with valid Bearer token', async () => {
      const res = await request(app)
        .get('/api/v1/auth/me')
        .set('Authorization', `Bearer ${accessToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.user.email).toBe(testUser.email.toLowerCase());
      expect(res.body.data.user.displayName).toBe(testUser.displayName);
    });

    it('returns 401 without Bearer token', async () => {
      const res = await request(app).get('/api/v1/auth/me');

      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
    });

    it('returns 401 with invalid Bearer token', async () => {
      const res = await request(app)
        .get('/api/v1/auth/me')
        .set('Authorization', 'Bearer invalid_garbage_token');

      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
    });
  });

  describe('POST /api/v1/auth/refresh', () => {
    it('rotates refresh token and returns new access token', async () => {
      const res = await request(app)
        .post('/api/v1/auth/refresh')
        .set('Cookie', authCookie)
        .send({ refreshToken });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toHaveProperty('accessToken');
      expect(res.body.data).toHaveProperty('refreshToken');

      // The new access token should work
      const meRes = await request(app)
        .get('/api/v1/auth/me')
        .set('Authorization', `Bearer ${res.body.data.accessToken}`);
      expect(meRes.status).toBe(200);
    });
  });

  describe('POST /api/v1/auth/logout', () => {
    it('logs out and revokes refresh token', async () => {
      const res = await request(app)
        .post('/api/v1/auth/logout')
        .set('Cookie', authCookie)
        .send({ refreshToken });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);

      // Old refresh token should now fail
      const refreshRes = await request(app).post('/api/v1/auth/refresh').send({ refreshToken });
      expect(refreshRes.status).toBe(401);
    });
  });
});
