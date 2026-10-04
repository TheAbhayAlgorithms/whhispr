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

describe('Contacts Integration Tests', () => {
  let user1Token = '';
  let user1Id = '';
  let user2Token = '';
  let user2Id = '';
  let user3Id = '';

  beforeAll(async () => {
    const timestamp = Date.now();

    // Register User 1
    const res1 = await request(app)
      .post('/api/v1/auth/register')
      .send({
        username: `contact_u1_${timestamp}`,
        email: `contact_u1_${timestamp}@beacon.chat`,
        password: 'Password123!',
        displayName: 'Contact User 1',
      });
    user1Token = res1.body.data.accessToken;
    user1Id = res1.body.data.user.id;

    // Register User 2
    const res2 = await request(app)
      .post('/api/v1/auth/register')
      .send({
        username: `contact_u2_${timestamp}`,
        email: `contact_u2_${timestamp}@beacon.chat`,
        password: 'Password123!',
        displayName: 'Contact User 2',
      });
    user2Token = res2.body.data.accessToken;
    user2Id = res2.body.data.user.id;

    // Register User 3
    const res3 = await request(app)
      .post('/api/v1/auth/register')
      .send({
        username: `contact_u3_${timestamp}`,
        email: `contact_u3_${timestamp}@beacon.chat`,
        password: 'Password123!',
        displayName: 'Contact User 3',
      });
    user3Id = res3.body.data.user.id;
  });

  describe('POST /api/v1/contacts/requests', () => {
    it('fails when unauthenticated', async () => {
      const res = await request(app)
        .post('/api/v1/contacts/requests')
        .send({ targetUserId: user2Id });

      expect(res.status).toBe(401);
    });

    it('fails when trying to add self as contact', async () => {
      const res = await request(app)
        .post('/api/v1/contacts/requests')
        .set('Authorization', `Bearer ${user1Token}`)
        .send({ targetUserId: user1Id });

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('CANNOT_ADD_SELF');
    });

    it('successfully sends contact request to another user', async () => {
      const res = await request(app)
        .post('/api/v1/contacts/requests')
        .set('Authorization', `Bearer ${user1Token}`)
        .send({ targetUserId: user2Id });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.status).toBe('pending');
    });

    it('fails when sending duplicate request', async () => {
      const res = await request(app)
        .post('/api/v1/contacts/requests')
        .set('Authorization', `Bearer ${user1Token}`)
        .send({ targetUserId: user2Id });

      expect(res.status).toBe(409);
      expect(res.body.error.code).toBe('REQUEST_ALREADY_SENT');
    });
  });

  describe('GET /api/v1/contacts/requests', () => {
    it('retrieves incoming request for addressee', async () => {
      const res = await request(app)
        .get('/api/v1/contacts/requests')
        .set('Authorization', `Bearer ${user2Token}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.incoming.length).toBeGreaterThanOrEqual(1);
      expect(res.body.data.incoming[0].userId).toBe(user1Id);
    });

    it('retrieves outgoing request for requester', async () => {
      const res = await request(app)
        .get('/api/v1/contacts/requests')
        .set('Authorization', `Bearer ${user1Token}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.outgoing.length).toBeGreaterThanOrEqual(1);
      expect(res.body.data.outgoing[0].userId).toBe(user2Id);
    });
  });

  describe('POST /api/v1/contacts/requests/:requestId/respond', () => {
    let requestId = '';

    beforeAll(async () => {
      const res = await request(app)
        .get('/api/v1/contacts/requests')
        .set('Authorization', `Bearer ${user2Token}`);
      requestId = res.body.data.incoming[0].requestId;
    });

    it('accepts incoming contact request successfully', async () => {
      const res = await request(app)
        .post(`/api/v1/contacts/requests/${requestId}/respond`)
        .set('Authorization', `Bearer ${user2Token}`)
        .send({ action: 'accept' });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });

    it('shows newly accepted contact in contacts list for both users', async () => {
      const res1 = await request(app)
        .get('/api/v1/contacts')
        .set('Authorization', `Bearer ${user1Token}`);

      expect(res1.status).toBe(200);
      expect(res1.body.data.contacts.some((c: { userId: string }) => c.userId === user2Id)).toBe(true);

      const res2 = await request(app)
        .get('/api/v1/contacts')
        .set('Authorization', `Bearer ${user2Token}`);

      expect(res2.status).toBe(200);
      expect(res2.body.data.contacts.some((c: { userId: string }) => c.userId === user1Id)).toBe(true);
    });
  });

  describe('DELETE /api/v1/contacts/:targetUserId', () => {
    it('removes an accepted contact', async () => {
      const res = await request(app)
        .delete(`/api/v1/contacts/${user2Id}`)
        .set('Authorization', `Bearer ${user1Token}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);

      // Verify contact is gone
      const checkRes = await request(app)
        .get('/api/v1/contacts')
        .set('Authorization', `Bearer ${user1Token}`);
      expect(checkRes.body.data.contacts.some((c: { userId: string }) => c.userId === user2Id)).toBe(false);
    });

    it('returns 404 when deleting a non-existent contact', async () => {
      const res = await request(app)
        .delete(`/api/v1/contacts/${user3Id}`)
        .set('Authorization', `Bearer ${user1Token}`);

      expect(res.status).toBe(404);
    });
  });
});
