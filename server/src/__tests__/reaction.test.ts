import request from 'supertest';
import http from 'http';
import { io as Client, Socket as ClientSocket } from 'socket.io-client';
import { createApp } from '../app';
import pool from '../config/database';
import redis from '../config/redis';
import { initSocketIO, closeSocketIO } from '../sockets';

describe('Message Reactions Integration Tests (Module 12)', () => {
  let app: ReturnType<typeof createApp>;
  let httpServer: http.Server;
  let serverPort: number;

  let user1Token = '';
  let user2Token = '';
  let user3Token = '';

  let directChatId = '';
  let testMessageId = '';

  beforeAll(async () => {
    app = createApp();
    httpServer = http.createServer(app);
    initSocketIO(httpServer);

    await new Promise<void>((resolve) => {
      httpServer.listen(0, () => {
        const addr = httpServer.address();
        if (addr && typeof addr === 'object') {
          serverPort = addr.port;
        }
        resolve();
      });
    });

    const timestamp = Date.now();

    // 1. Register User 1
    const res1 = await request(app)
      .post('/api/v1/auth/register')
      .send({
        username: `rxn_u1_${timestamp}`,
        email: `rxn_u1_${timestamp}@beacon.chat`,
        password: 'Password123!',
        displayName: 'Reaction Alice',
      });
    user1Token = res1.body.data.accessToken;

    // 2. Register User 2
    const res2 = await request(app)
      .post('/api/v1/auth/register')
      .send({
        username: `rxn_u2_${timestamp}`,
        email: `rxn_u2_${timestamp}@beacon.chat`,
        password: 'Password123!',
        displayName: 'Reaction Bob',
      });
    user2Token = res2.body.data.accessToken;
    const user2Id = res2.body.data.user.id;

    // 3. Register User 3 (Non-member)
    const res3 = await request(app)
      .post('/api/v1/auth/register')
      .send({
        username: `rxn_u3_${timestamp}`,
        email: `rxn_u3_${timestamp}@beacon.chat`,
        password: 'Password123!',
        displayName: 'Reaction Carol',
      });
    user3Token = res3.body.data.accessToken;

    // 4. Create direct chat between User 1 and User 2
    const chatRes = await request(app)
      .post('/api/v1/chats/direct')
      .set('Authorization', `Bearer ${user1Token}`)
      .send({ targetUserId: user2Id });
    directChatId = chatRes.body.data.chat.id;

    // 5. Send a message to react to
    const msgRes = await request(app)
      .post(`/api/v1/chats/${directChatId}/messages`)
      .set('Authorization', `Bearer ${user1Token}`)
      .send({ content: 'React to this message!' });
    testMessageId = msgRes.body.data.message.id;
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

  it('fails when unauthenticated', async () => {
    const res = await request(app)
      .post(`/api/v1/messages/${testMessageId}/reactions`)
      .send({ emoji: '❤️' });

    expect(res.status).toBe(401);
  });

  it('fails when user is not a member of the chat with 403', async () => {
    const res = await request(app)
      .post(`/api/v1/messages/${testMessageId}/reactions`)
      .set('Authorization', `Bearer ${user3Token}`)
      .send({ emoji: '❤️' });

    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe('NOT_CHAT_MEMBER');
  });

  it('fails when message does not exist with 404', async () => {
    const res = await request(app)
      .post(`/api/v1/messages/00000000-0000-0000-0000-000000000000/reactions`)
      .set('Authorization', `Bearer ${user1Token}`)
      .send({ emoji: '❤️' });

    expect(res.status).toBe(404);
    expect(res.body.error.code).toBe('MESSAGE_NOT_FOUND');
  });

  it('adds an emoji reaction successfully', async () => {
    const res = await request(app)
      .post(`/api/v1/messages/${testMessageId}/reactions`)
      .set('Authorization', `Bearer ${user1Token}`)
      .send({ emoji: '❤️' });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.action).toBe('added');
    expect(res.body.data.emoji).toBe('❤️');
    expect(res.body.data.reactions).toHaveLength(1);
    expect(res.body.data.reactions[0].emoji).toBe('❤️');
    expect(res.body.data.reactions[0].count).toBe(1);
    expect(res.body.data.reactions[0].hasReacted).toBe(true);
  });

  it('allows a second user to react with the same emoji and aggregates count', async () => {
    const res = await request(app)
      .post(`/api/v1/messages/${testMessageId}/reactions`)
      .set('Authorization', `Bearer ${user2Token}`)
      .send({ emoji: '❤️' });

    expect(res.status).toBe(200);
    expect(res.body.data.action).toBe('added');
    const heart = res.body.data.reactions.find((r: { emoji: string }) => r.emoji === '❤️');
    expect(heart).toBeDefined();
    expect(heart.count).toBe(2);
    expect(heart.hasReacted).toBe(true);
  });

  it('supports reacting with different emojis on the same message', async () => {
    const res = await request(app)
      .post(`/api/v1/messages/${testMessageId}/reactions`)
      .set('Authorization', `Bearer ${user2Token}`)
      .send({ emoji: '🔥' });

    expect(res.status).toBe(200);
    expect(res.body.data.action).toBe('added');
    expect(res.body.data.reactions.length).toBeGreaterThanOrEqual(2);
  });

  it('toggles off (removes) a reaction when reacting again with the same emoji', async () => {
    const res = await request(app)
      .post(`/api/v1/messages/${testMessageId}/reactions`)
      .set('Authorization', `Bearer ${user1Token}`)
      .send({ emoji: '❤️' });

    expect(res.status).toBe(200);
    expect(res.body.data.action).toBe('removed');
    const heart = res.body.data.reactions.find((r: { emoji: string }) => r.emoji === '❤️');
    expect(heart.count).toBe(1); // User 2 still has ❤️ on it
    expect(heart.hasReacted).toBe(false); // User 1 no longer has reacted
  });

  it('reflects reactions in GET /api/v1/chats/:chatId/messages', async () => {
    const res = await request(app)
      .get(`/api/v1/chats/${directChatId}/messages`)
      .set('Authorization', `Bearer ${user2Token}`);

    expect(res.status).toBe(200);
    const msg = res.body.data.messages.find((m: { id: string }) => m.id === testMessageId);
    expect(msg).toBeDefined();
    expect(Array.isArray(msg.reactions)).toBe(true);
    expect(msg.reactions.length).toBeGreaterThanOrEqual(1);

    const heart = msg.reactions.find((r: { emoji: string }) => r.emoji === '❤️');
    expect(heart).toBeDefined();
    expect(heart.hasReacted).toBe(true); // User 2 is viewing
  });

  it('broadcasts message:reaction_updated event over Socket.IO', (done) => {
    const bobSocket: ClientSocket = Client(`http://localhost:${serverPort}`, {
      transports: ['websocket'],
      auth: { token: user2Token },
      autoConnect: true,
      reconnection: false,
    });

    bobSocket.on('connected', () => {
      bobSocket.emit('chat:join', directChatId, () => {
        void request(app)
          .post(`/api/v1/messages/${testMessageId}/reactions`)
          .set('Authorization', `Bearer ${user1Token}`)
          .send({ emoji: '🎉' })
          .then((res) => {
            expect(res.status).toBe(200);
          })
          .catch((err: unknown) => {
            done(err);
          });
      });
    });

    bobSocket.on(
      'message:reaction_updated',
      (data: {
        messageId: string;
        chatId: string;
        emoji: string;
        action: string;
        reactions: Array<{ emoji: string; count: number }>;
      }) => {
        expect(data.messageId).toBe(testMessageId);
        expect(data.chatId).toBe(directChatId);
        expect(data.emoji).toBe('🎉');
        expect(data.action).toBe('added');
        expect(Array.isArray(data.reactions)).toBe(true);
        bobSocket.close();
        done();
      },
    );
  });
});
