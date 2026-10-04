import request from 'supertest';
import http from 'http';
import { io as Client, Socket as ClientSocket } from 'socket.io-client';
import { createApp } from '../app';
import pool from '../config/database';
import redis from '../config/redis';
import { initSocketIO, closeSocketIO } from '../sockets';

describe('1-on-1 Direct Messaging Integration Tests', () => {
  let app: ReturnType<typeof createApp>;
  let httpServer: http.Server;
  let serverPort: number;

  let user1Token = '';
  let user1Id = '';
  let user2Token = '';
  let user2Id = '';
  let user3Token = '';

  let directChatId = '';

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

    // Register User 1
    const res1 = await request(app)
      .post('/api/v1/auth/register')
      .send({
        username: `chat_u1_${timestamp}`,
        email: `chat_u1_${timestamp}@beacon.chat`,
        password: 'Password123!',
        displayName: 'Chat Alice',
      });
    user1Token = res1.body.data.accessToken;
    user1Id = res1.body.data.user.id;

    // Register User 2
    const res2 = await request(app)
      .post('/api/v1/auth/register')
      .send({
        username: `chat_u2_${timestamp}`,
        email: `chat_u2_${timestamp}@beacon.chat`,
        password: 'Password123!',
        displayName: 'Chat Bob',
      });
    user2Token = res2.body.data.accessToken;
    user2Id = res2.body.data.user.id;

    // Register User 3
    const res3 = await request(app)
      .post('/api/v1/auth/register')
      .send({
        username: `chat_u3_${timestamp}`,
        email: `chat_u3_${timestamp}@beacon.chat`,
        password: 'Password123!',
        displayName: 'Chat Carol',
      });
    user3Token = res3.body.data.accessToken;
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

  describe('POST /api/v1/chats/direct', () => {
    it('fails when unauthenticated', async () => {
      const res = await request(app)
        .post('/api/v1/chats/direct')
        .send({ targetUserId: user2Id });

      expect(res.status).toBe(401);
    });

    it('fails when attempting to chat with oneself', async () => {
      const res = await request(app)
        .post('/api/v1/chats/direct')
        .set('Authorization', `Bearer ${user1Token}`)
        .send({ targetUserId: user1Id });

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('CANNOT_CHAT_SELF');
    });

    it('creates a new direct chat between user 1 and user 2', async () => {
      const res = await request(app)
        .post('/api/v1/chats/direct')
        .set('Authorization', `Bearer ${user1Token}`)
        .send({ targetUserId: user2Id });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.chat.id).toBeDefined();
      expect(res.body.data.chat.type).toBe('direct');
      expect(res.body.data.chat.otherUser.id).toBe(user2Id);

      directChatId = res.body.data.chat.id;
    });

    it('is idempotent — returns the same chat when requested again', async () => {
      const res = await request(app)
        .post('/api/v1/chats/direct')
        .set('Authorization', `Bearer ${user2Token}`)
        .send({ targetUserId: user1Id });

      expect(res.status).toBe(200);
      expect(res.body.data.chat.id).toBe(directChatId);
    });
  });

  describe('GET /api/v1/chats', () => {
    it('lists user chats with participant info', async () => {
      const res = await request(app)
        .get('/api/v1/chats')
        .set('Authorization', `Bearer ${user1Token}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.chats.length).toBeGreaterThanOrEqual(1);

      const found = res.body.data.chats.find((c: { id: string }) => c.id === directChatId);
      expect(found).toBeDefined();
      expect(found.otherUser.id).toBe(user2Id);
    });
  });

  describe('POST /api/v1/chats/:chatId/messages', () => {
    it('sends a message in direct chat successfully', async () => {
      const res = await request(app)
        .post(`/api/v1/chats/${directChatId}/messages`)
        .set('Authorization', `Bearer ${user1Token}`)
        .send({ content: 'Hello Bob! How are you?' });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.message.content).toBe('Hello Bob! How are you?');
      expect(res.body.data.message.senderId).toBe(user1Id);
      expect(res.body.data.message.sender.displayName).toBe('Chat Alice');
    });

    it('rejects empty message content with 422', async () => {
      const res = await request(app)
        .post(`/api/v1/chats/${directChatId}/messages`)
        .set('Authorization', `Bearer ${user1Token}`)
        .send({ content: '' });

      expect(res.status).toBe(422);
    });

    it('rejects sending message from a non-member (User 3) with 403', async () => {
      const res = await request(app)
        .post(`/api/v1/chats/${directChatId}/messages`)
        .set('Authorization', `Bearer ${user3Token}`)
        .send({ content: 'I should not be able to send here' });

      expect(res.status).toBe(403);
      expect(res.body.error.code).toBe('NOT_CHAT_MEMBER');
    });
  });

  describe('GET /api/v1/chats/:chatId/messages', () => {
    it('fetches messages for chat participants', async () => {
      const res = await request(app)
        .get(`/api/v1/chats/${directChatId}/messages`)
        .set('Authorization', `Bearer ${user2Token}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.messages.length).toBeGreaterThanOrEqual(1);
      expect(res.body.data.messages[0].content).toBe('Hello Bob! How are you?');
    });

    it('blocks non-members from viewing chat messages with 403', async () => {
      const res = await request(app)
        .get(`/api/v1/chats/${directChatId}/messages`)
        .set('Authorization', `Bearer ${user3Token}`);

      expect(res.status).toBe(403);
      expect(res.body.error.code).toBe('NOT_CHAT_MEMBER');
    });
  });

  describe('Real-Time Message Broadcast over Socket.IO', () => {
    it('broadcasts message:new to participants joined in chat room', (done) => {
      const bobSocket: ClientSocket = Client(`http://localhost:${serverPort}`, {
        transports: ['websocket'],
        auth: { token: user2Token },
        autoConnect: true,
        reconnection: false,
      });

      bobSocket.on('connect_error', (err) => {
        done(err);
      });

      bobSocket.on('connected', () => {
        bobSocket.emit('chat:join', directChatId, (joined: boolean) => {
          expect(joined).toBe(true);

          void request(app)
            .post(`/api/v1/chats/${directChatId}/messages`)
            .set('Authorization', `Bearer ${user1Token}`)
            .send({ content: 'Real-time test message!' })
            .then((res) => {
              expect(res.status).toBe(201);
            })
            .catch((err: unknown) => {
              done(err);
            });
        });
      });

      bobSocket.on('message:new', (msg: { chatId: string; content: string; senderId: string; status?: string }) => {
        expect(msg.chatId).toBe(directChatId);
        expect(msg.content).toBe('Real-time test message!');
        expect(msg.senderId).toBe(user1Id);
        expect(['sent', 'delivered', 'read']).toContain(msg.status);
        bobSocket.close();
        done();
      });
    });
  });

  describe('Read Receipts & Typing Indicators (Module 9)', () => {
    it('marks chat messages as read via POST /api/v1/chats/:chatId/read', async () => {
      // User 2 (Bob) marks the chat as read
      const res = await request(app)
        .post(`/api/v1/chats/${directChatId}/read`)
        .set('Authorization', `Bearer ${user2Token}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.chatId).toBe(directChatId);
      expect(res.body.data.affectedCount).toBeGreaterThanOrEqual(1);
      expect(Array.isArray(res.body.data.readMessageIds)).toBe(true);

      // Verify messages now show read status
      const msgRes = await request(app)
        .get(`/api/v1/chats/${directChatId}/messages`)
        .set('Authorization', `Bearer ${user1Token}`);

      expect(msgRes.status).toBe(200);
      const messages = msgRes.body.data.messages;
      expect(messages[0].status).toBe('read');
    });

    it('blocks non-members from marking a chat as read with 403', async () => {
      const res = await request(app)
        .post(`/api/v1/chats/${directChatId}/read`)
        .set('Authorization', `Bearer ${user3Token}`);

      expect(res.status).toBe(403);
      expect(res.body.error.code).toBe('NOT_CHAT_MEMBER');
    });

    it('handles typing:start and typing:stop socket events', (done) => {
      const aliceSocket: ClientSocket = Client(`http://localhost:${serverPort}`, {
        transports: ['websocket'],
        auth: { token: user1Token },
        autoConnect: true,
        reconnection: false,
      });

      const bobSocket: ClientSocket = Client(`http://localhost:${serverPort}`, {
        transports: ['websocket'],
        auth: { token: user2Token },
        autoConnect: true,
        reconnection: false,
      });

      let aliceConnected = false;
      let bobConnected = false;
      let step = 0;

      const tryStart = () => {
        if (!aliceConnected || !bobConnected) return;
        bobSocket.emit('chat:join', directChatId, () => {
          aliceSocket.emit('chat:join', directChatId, () => {
            aliceSocket.emit('typing:start', { chatId: directChatId });
          });
        });
      };

      aliceSocket.on('connected', () => {
        aliceConnected = true;
        tryStart();
      });

      bobSocket.on('connected', () => {
        bobConnected = true;
        tryStart();
      });

      bobSocket.on('typing:update', (data: { chatId: string; isTyping: boolean; username: string }) => {
        expect(data.chatId).toBe(directChatId);

        if (step === 0) {
          expect(data.isTyping).toBe(true);
          step = 1;
          // Alice stops typing
          aliceSocket.emit('typing:stop', { chatId: directChatId });
        } else if (step === 1) {
          expect(data.isTyping).toBe(false);
          aliceSocket.close();
          bobSocket.close();
          done();
        }
      });
    });
  });
});
