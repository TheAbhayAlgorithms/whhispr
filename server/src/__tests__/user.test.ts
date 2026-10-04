import request from 'supertest';
import { createApp } from '../app';
import pool from '../config/database';
import redis from '../config/redis';

const app = createApp();

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

describe('User Profiles Integration Tests', () => {
  let userToken = '';
  let otherUserId = '';
  let otherUsername = '';

  beforeAll(async () => {
    const timestamp = Date.now();
    // Register primary user
    const res1 = await request(app)
      .post('/api/v1/auth/register')
      .send({
        username: `prof_user_${timestamp}`,
        email: `prof_${timestamp}@beacon.chat`,
        password: 'Password123!',
        displayName: 'Profile Master',
      });
    userToken = res1.body.data.accessToken;

    // Register second user
    otherUsername = `target_user_${timestamp}`;
    const res2 = await request(app)
      .post('/api/v1/auth/register')
      .send({
        username: otherUsername,
        email: `target_${timestamp}@beacon.chat`,
        password: 'Password123!',
        displayName: 'Target User',
      });
    otherUserId = res2.body.data.user.id;
  });

  describe('GET /api/v1/users/profile/me', () => {
    it('returns full personal profile with 200', async () => {
      const res = await request(app)
        .get('/api/v1/users/profile/me')
        .set('Authorization', `Bearer ${userToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.profile).toHaveProperty('userId');
      expect(res.body.data.profile.displayName).toBe('Profile Master');
      expect(res.body.data.profile).toHaveProperty('avatarVisibility');
      expect(res.body.data.profile).toHaveProperty('lastSeenVisibility');
    });

    it('returns 401 without authentication', async () => {
      const res = await request(app).get('/api/v1/users/profile/me');
      expect(res.status).toBe(401);
    });
  });

  describe('PATCH /api/v1/users/profile/me', () => {
    it('updates profile fields successfully', async () => {
      const res = await request(app)
        .patch('/api/v1/users/profile/me')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          displayName: 'Updated Display Name',
          bio: 'Full stack builder with real-time sockets',
          statusMessage: 'Available for chats 💬',
          avatarVisibility: 'contacts',
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.profile.displayName).toBe('Updated Display Name');
      expect(res.body.data.profile.bio).toBe('Full stack builder with real-time sockets');
      expect(res.body.data.profile.statusMessage).toBe('Available for chats 💬');
      expect(res.body.data.profile.avatarVisibility).toBe('contacts');
    });

    it('rejects overly long bio with 422', async () => {
      const longBio = 'a'.repeat(501);
      const res = await request(app)
        .patch('/api/v1/users/profile/me')
        .set('Authorization', `Bearer ${userToken}`)
        .send({ bio: longBio });

      expect(res.status).toBe(422);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
    });
  });

  describe('POST & DELETE /api/v1/users/profile/avatar', () => {
    it('uploads an image avatar and updates profile', async () => {
      // 1x1 transparent PNG buffer
      const pngBuffer = Buffer.from(
        'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
        'base64',
      );

      const res = await request(app)
        .post('/api/v1/users/profile/avatar')
        .set('Authorization', `Bearer ${userToken}`)
        .attach('avatar', pngBuffer, 'test-avatar.png');

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.avatarUrl).toContain('/uploads/avatars/');

      // Verify on profile
      const meRes = await request(app)
        .get('/api/v1/users/profile/me')
        .set('Authorization', `Bearer ${userToken}`);
      expect(meRes.body.data.profile.avatarUrl).toBe(res.body.data.avatarUrl);
    });

    it('rejects non-image upload with 400', async () => {
      const textBuffer = Buffer.from('This is not an image');

      const res = await request(app)
        .post('/api/v1/users/profile/avatar')
        .set('Authorization', `Bearer ${userToken}`)
        .attach('avatar', textBuffer, 'test.txt');

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });

    it('removes avatar and resets to null', async () => {
      const res = await request(app)
        .delete('/api/v1/users/profile/avatar')
        .set('Authorization', `Bearer ${userToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);

      const meRes = await request(app)
        .get('/api/v1/users/profile/me')
        .set('Authorization', `Bearer ${userToken}`);
      expect(meRes.body.data.profile.avatarUrl).toBeNull();
    });
  });

  describe('GET /api/v1/users/:id/profile', () => {
    it('views public profile of another user', async () => {
      const res = await request(app)
        .get(`/api/v1/users/${otherUserId}/profile`)
        .set('Authorization', `Bearer ${userToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.profile.userId).toBe(otherUserId);
      expect(res.body.data.profile.displayName).toBe('Target User');
      expect(res.body.data.profile).toHaveProperty('isContact');
      expect(res.body.data.profile).toHaveProperty('canAdd');
    });

    it('returns 404 for non-existent user profile', async () => {
      const randomUuid = '00000000-0000-0000-0000-000000000000';
      const res = await request(app)
        .get(`/api/v1/users/${randomUuid}/profile`)
        .set('Authorization', `Bearer ${userToken}`);

      expect(res.status).toBe(404);
      expect(res.body.success).toBe(false);
    });
  });

  describe('GET /api/v1/users/search', () => {
    it('searches for users matching query', async () => {
      const res = await request(app)
        .get(`/api/v1/users/search?q=${otherUsername}`)
        .set('Authorization', `Bearer ${userToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.data.users)).toBe(true);
      expect(res.body.data.users.some((u: any) => u.userId === otherUserId)).toBe(true);
    });
  });
});
