import request from 'supertest';
import http from 'http';
import { createApp } from '../app';
import pool from '../config/database';
import redis from '../config/redis';
import { initSocketIO, closeSocketIO } from '../sockets';

describe('Search Module Integration Tests', () => {
  let app: ReturnType<typeof createApp>;
  let httpServer: http.Server;

  let aliceToken = '';
  let aliceId = '';
  let bobToken = '';
  let bobId = '';

  let directChatId = '';
  let publicChannelId = '';
  let secretChatId = '';

  beforeAll(async () => {
    app = createApp();
    httpServer = http.createServer(app);
    initSocketIO(httpServer);

    await new Promise<void>((resolve) => {
      httpServer.listen(0, () => resolve());
    });

    const timestamp = Date.now();

    // Alice
    const resA = await request(app)
      .post('/api/v1/auth/register')
      .send({
        username: `search_alice_${timestamp}`,
        email: `search_alice_${timestamp}@beacon.chat`,
        password: 'Password123!',
        displayName: 'Search Alice',
      });
    aliceToken = resA.body.data.accessToken;
    aliceId = resA.body.data.user.id;

    // Bob
    const resB = await request(app)
      .post('/api/v1/auth/register')
      .send({
        username: `search_bob_${timestamp}`,
        email: `search_bob_${timestamp}@beacon.chat`,
        password: 'Password123!',
        displayName: 'Search Bob',
      });
    bobToken = resB.body.data.accessToken;
    bobId = resB.body.data.user.id;

    // Eve (not in Alice's direct chat)
    const resE = await request(app)
      .post('/api/v1/auth/register')
      .send({
        username: `search_eve_${timestamp}`,
        email: `search_eve_${timestamp}@beacon.chat`,
        password: 'Password123!',
        displayName: 'Search Eve',
      });

    // 1. Direct Chat Alice & Bob
    const directRes = await request(app)
      .post('/api/v1/chats/direct')
      .set('Authorization', `Bearer ${aliceToken}`)
      .send({ targetUserId: bobId });
    directChatId = directRes.body.data.chat.id;

    // 2. Public Channel created by Alice
    const chanRes = await request(app)
      .post('/api/v1/groups/channels')
      .set('Authorization', `Bearer ${aliceToken}`)
      .send({
        name: `cryptography-lab-${timestamp}`,
        description: 'Discussions on quantum cryptography',
        isPublic: true,
      });
    publicChannelId = chanRes.body.data.id;

    // 3. Secret Chat between Alice and someone else (Eve's secret chat that Bob is not in)
    const secretRes = await request(app)
      .post('/api/v1/chats/direct')
      .set('Authorization', `Bearer ${aliceToken}`)
      .send({ targetUserId: resE.body.data.user.id });
    secretChatId = secretRes.body.data.chat.id;

    // Seed Messages
    // Alice in direct chat
    await request(app)
      .post(`/api/v1/chats/${directChatId}/messages`)
      .set('Authorization', `Bearer ${aliceToken}`)
      .send({ content: 'Welcome to quantum teleportation experiments' });

    // Bob in direct chat
    await request(app)
      .post(`/api/v1/chats/${directChatId}/messages`)
      .set('Authorization', `Bearer ${bobToken}`)
      .send({ content: 'The quantum entanglement results look promising' });

    // Alice in secret chat (Bob is NOT in this chat)
    await request(app)
      .post(`/api/v1/chats/${secretChatId}/messages`)
      .set('Authorization', `Bearer ${aliceToken}`)
      .send({ content: 'Top secret quantum codes only for Eve' });

    // Alice in public channel
    await request(app)
      .post(`/api/v1/chats/${publicChannelId}/messages`)
      .set('Authorization', `Bearer ${aliceToken}`)
      .send({ content: 'Channel announcement: quantum computing symposium next week' });
  });

  afterAll(async () => {
    await closeSocketIO();
    await new Promise<void>((resolve) => httpServer.close(() => resolve()));
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

  describe('GET /api/v1/search/messages', () => {
    it('fails without auth token', async () => {
      const res = await request(app).get('/api/v1/search/messages?q=quantum');
      expect(res.status).toBe(401);
    });

    it('fails if query string is empty', async () => {
      const res = await request(app)
        .get('/api/v1/search/messages?q=')
        .set('Authorization', `Bearer ${bobToken}`);
      expect(res.status).toBe(422);
    });

    it('finds messages matching query across all chats caller is member of', async () => {
      const res = await request(app)
        .get('/api/v1/search/messages?q=quantum')
        .set('Authorization', `Bearer ${bobToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      const messages = res.body.data.messages;

      // Bob should see messages in directChatId
      expect(messages.length).toBeGreaterThanOrEqual(2);
      const contents = (messages as Array<{ content: string }>).map((m) => m.content);
      expect(contents.some((c: string) => c.includes('teleportation'))).toBe(true);
      expect(contents.some((c: string) => c.includes('entanglement'))).toBe(true);

      // Bob should NOT see the secret chat message
      expect(contents.some((c: string) => c.includes('Top secret'))).toBe(false);
    });

    it('scopes search to a specific chatId when specified', async () => {
      const res = await request(app)
        .get(`/api/v1/search/messages?q=quantum&chatId=${directChatId}`)
        .set('Authorization', `Bearer ${aliceToken}`);

      expect(res.status).toBe(200);
      const messages = res.body.data.messages;
      expect(messages.every((m: any) => m.chatId === directChatId)).toBe(true);
    });

    it('excludes messages deleted for everyone', async () => {
      // Send and delete message
      const msgRes = await request(app)
        .post(`/api/v1/chats/${directChatId}/messages`)
        .set('Authorization', `Bearer ${aliceToken}`)
        .send({ content: 'Vanishable quantum secret' });
      const delId = msgRes.body.data.message.id;

      await request(app)
        .delete(`/api/v1/messages/${delId}`)
        .set('Authorization', `Bearer ${aliceToken}`)
        .send({ mode: 'everyone' });

      const searchRes = await request(app)
        .get('/api/v1/search/messages?q=Vanishable')
        .set('Authorization', `Bearer ${bobToken}`);

      expect(searchRes.status).toBe(200);
      expect(searchRes.body.data.messages).toHaveLength(0);
    });

    it('excludes messages deleted for me by the caller', async () => {
      const msgRes = await request(app)
        .post(`/api/v1/chats/${directChatId}/messages`)
        .set('Authorization', `Bearer ${aliceToken}`)
        .send({ content: 'Disappearing locally quantum note' });
      const noteId = msgRes.body.data.message.id;

      // Alice deletes for herself
      await request(app)
        .delete(`/api/v1/messages/${noteId}`)
        .set('Authorization', `Bearer ${aliceToken}`)
        .send({ mode: 'me' });

      // Alice searches: should not see it
      const aliceSearch = await request(app)
        .get('/api/v1/search/messages?q=Disappearing')
        .set('Authorization', `Bearer ${aliceToken}`);
      expect(aliceSearch.body.data.messages).toHaveLength(0);

      // Bob searches: should see it
      const bobSearch = await request(app)
        .get('/api/v1/search/messages?q=Disappearing')
        .set('Authorization', `Bearer ${bobToken}`);
      expect(bobSearch.body.data.messages.length).toBeGreaterThanOrEqual(1);
    });
  });

  describe('GET /api/v1/search/users', () => {
    it('searches users by username or display name', async () => {
      const res = await request(app)
        .get('/api/v1/search/users?q=Search Bob')
        .set('Authorization', `Bearer ${aliceToken}`);

      expect(res.status).toBe(200);
      const users = res.body.data.users;
      expect(users.length).toBeGreaterThanOrEqual(1);
      const bobUser = users.find((u: any) => u.userId === bobId);
      expect(bobUser).toBeDefined();
      expect(bobUser.displayName).toBe('Search Bob');
    });

    it('excludes caller from user search results', async () => {
      const res = await request(app)
        .get('/api/v1/search/users?q=Search Alice')
        .set('Authorization', `Bearer ${aliceToken}`);

      expect(res.status).toBe(200);
      const users = res.body.data.users;
      expect(users.some((u: any) => u.userId === aliceId)).toBe(false);
    });
  });

  describe('GET /api/v1/search/chats', () => {
    it('discovers public channels and caller groups', async () => {
      const res = await request(app)
        .get('/api/v1/search/chats?q=cryptography')
        .set('Authorization', `Bearer ${bobToken}`);

      expect(res.status).toBe(200);
      const chats = res.body.data.chats;
      expect(chats.length).toBeGreaterThanOrEqual(1);
      expect(chats[0].isPublic).toBe(true);
      expect(chats[0].name).toContain('cryptography');
    });
  });

  describe('GET /api/v1/search (Unified Search)', () => {
    it('returns combined results for messages, users, and chats', async () => {
      const res = await request(app)
        .get('/api/v1/search?q=quantum')
        .set('Authorization', `Bearer ${aliceToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data).toBeDefined();
      expect(Array.isArray(res.body.data.messages)).toBe(true);
      expect(Array.isArray(res.body.data.users)).toBe(true);
      expect(Array.isArray(res.body.data.chats)).toBe(true);
      expect(res.body.data.messages.length).toBeGreaterThanOrEqual(1);
    });
  });
});
