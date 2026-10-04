import request from 'supertest';
import http from 'http';
import { io as Client, Socket as ClientSocket } from 'socket.io-client';
import { createApp } from '../app';
import pool from '../config/database';
import redis from '../config/redis';
import { initSocketIO, closeSocketIO } from '../sockets';

describe('Message Editing, Deletion & Replies Integration Tests', () => {
  let app: ReturnType<typeof createApp>;
  let httpServer: http.Server;
  let serverPort: number;

  let aliceToken = '';
  let bobToken = '';
  let bobId = '';
  let charlieId = '';

  let directChatId = '';
  let groupChatId = '';

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

    // Alice
    const resA = await request(app)
      .post('/api/v1/auth/register')
      .send({
        username: `act_alice_${timestamp}`,
        email: `act_alice_${timestamp}@beacon.chat`,
        password: 'Password123!',
        displayName: 'Action Alice',
      });
    aliceToken = resA.body.data.accessToken;

    // Bob
    const resB = await request(app)
      .post('/api/v1/auth/register')
      .send({
        username: `act_bob_${timestamp}`,
        email: `act_bob_${timestamp}@beacon.chat`,
        password: 'Password123!',
        displayName: 'Action Bob',
      });
    bobToken = resB.body.data.accessToken;
    bobId = resB.body.data.user.id;

    // Charlie
    const resC = await request(app)
      .post('/api/v1/auth/register')
      .send({
        username: `act_charlie_${timestamp}`,
        email: `act_charlie_${timestamp}@beacon.chat`,
        password: 'Password123!',
        displayName: 'Action Charlie',
      });
    charlieId = resC.body.data.user.id;

    // Create direct chat between Alice and Bob
    const chatRes = await request(app)
      .post('/api/v1/chats/direct')
      .set('Authorization', `Bearer ${aliceToken}`)
      .send({ targetUserId: bobId });
    directChatId = chatRes.body.data.chat.id;

    // Create group chat with Alice as owner, Bob and Charlie as members
    const grpRes = await request(app)
      .post('/api/v1/groups')
      .set('Authorization', `Bearer ${aliceToken}`)
      .send({
        name: `Action Group ${timestamp}`,
        memberIds: [bobId, charlieId],
      });
    groupChatId = grpRes.body.data.id;
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

  describe('Message Replies / Threading', () => {
    let parentMsgId = '';

    beforeAll(async () => {
      const msgRes = await request(app)
        .post(`/api/v1/chats/${directChatId}/messages`)
        .set('Authorization', `Bearer ${aliceToken}`)
        .send({ content: 'Hey Bob, what do you think of Antigravity?' });
      parentMsgId = msgRes.body.data.message.id;
    });

    it('fails to reply if replyToId does not exist in chat', async () => {
      const res = await request(app)
        .post(`/api/v1/chats/${directChatId}/messages`)
        .set('Authorization', `Bearer ${bobToken}`)
        .send({
          content: 'This replies to a ghost',
          replyToId: '00000000-0000-0000-0000-000000000000',
        });

      expect(res.status).toBe(404);
      expect(res.body.error.code).toBe('MESSAGE_NOT_FOUND');
    });

    it('successfully sends a message replying to parent with preview returned', async () => {
      const res = await request(app)
        .post(`/api/v1/chats/${directChatId}/messages`)
        .set('Authorization', `Bearer ${bobToken}`)
        .send({
          content: 'It is amazing!',
          replyToId: parentMsgId,
        });

      expect(res.status).toBe(201);
      const msg = res.body.data.message;
      expect(msg.replyToId).toBe(parentMsgId);
      expect(msg.replyTo).toBeDefined();
      expect(msg.replyTo.id).toBe(parentMsgId);
      expect(msg.replyTo.content).toBe('Hey Bob, what do you think of Antigravity?');
      expect(msg.replyTo.sender.displayName).toBe('Action Alice');
    });

    it('includes replyTo preview when fetching message history', async () => {
      const res = await request(app)
        .get(`/api/v1/chats/${directChatId}/messages`)
        .set('Authorization', `Bearer ${aliceToken}`);

      expect(res.status).toBe(200);
      const messages = res.body.data.messages;
      const replyMsg = messages.find((m: any) => m.replyToId === parentMsgId);
      expect(replyMsg).toBeDefined();
      expect(replyMsg.replyTo).toBeDefined();
      expect(replyMsg.replyTo.content).toBe('Hey Bob, what do you think of Antigravity?');
      expect(replyMsg.replyTo.sender.username).toContain('act_alice');
    });
  });

  describe('PATCH /api/v1/messages/:messageId (Edit Message)', () => {
    let msgId = '';

    beforeAll(async () => {
      const res = await request(app)
        .post(`/api/v1/chats/${directChatId}/messages`)
        .set('Authorization', `Bearer ${aliceToken}`)
        .send({ content: 'Original message typo' });
      msgId = res.body.data.message.id;
    });

    it('fails without auth token', async () => {
      const res = await request(app)
        .patch(`/api/v1/messages/${msgId}`)
        .send({ content: 'New text' });
      expect(res.status).toBe(401);
    });

    it('fails if non-author tries to edit', async () => {
      const res = await request(app)
        .patch(`/api/v1/messages/${msgId}`)
        .set('Authorization', `Bearer ${bobToken}`)
        .send({ content: 'Hacked by Bob' });

      expect(res.status).toBe(403);
      expect(res.body.error.code).toBe('NOT_MESSAGE_AUTHOR');
    });

    it('fails with empty content', async () => {
      const res = await request(app)
        .patch(`/api/v1/messages/${msgId}`)
        .set('Authorization', `Bearer ${aliceToken}`)
        .send({ content: '   ' });

      expect(res.status).toBe(400);
    });

    it('successfully edits message, setting isEdited and editedAt', async () => {
      const res = await request(app)
        .patch(`/api/v1/messages/${msgId}`)
        .set('Authorization', `Bearer ${aliceToken}`)
        .send({ content: 'Original message fixed!' });

      expect(res.status).toBe(200);
      const msg = res.body.data.message;
      expect(msg.content).toBe('Original message fixed!');
      expect(msg.isEdited).toBe(true);
      expect(msg.editedAt).toBeDefined();
    });

    it('broadcasts message:updated event over socket.io', (done) => {
      const bobSocket: ClientSocket = Client(`http://localhost:${serverPort}`, {
        transports: ['websocket'],
        auth: { token: bobToken },
        autoConnect: true,
        reconnection: false,
      });

      bobSocket.on('connected', () => {
        bobSocket.emit('chat:join', directChatId, () => {
          void request(app)
            .patch(`/api/v1/messages/${msgId}`)
            .set('Authorization', `Bearer ${aliceToken}`)
            .send({ content: 'Real-time updated content' })
            .then((res) => {
              expect(res.status).toBe(200);
            })
            .catch((err: unknown) => {
              done(err);
            });
        });
      });

      bobSocket.on('message:updated', (data: any) => {
        expect(data.id).toBe(msgId);
        expect(data.content).toBe('Real-time updated content');
        expect(data.isEdited).toBe(true);
        bobSocket.close();
        done();
      });
    });
  });

  describe('DELETE /api/v1/messages/:messageId (Delete Message)', () => {
    let msgForMeId = '';
    let msgForEveryoneId = '';

    beforeEach(async () => {
      const res1 = await request(app)
        .post(`/api/v1/chats/${directChatId}/messages`)
        .set('Authorization', `Bearer ${aliceToken}`)
        .send({ content: 'Message to delete for me only' });
      msgForMeId = res1.body.data.message.id;

      const res2 = await request(app)
        .post(`/api/v1/chats/${directChatId}/messages`)
        .set('Authorization', `Bearer ${aliceToken}`)
        .send({ content: 'Message to delete for everyone' });
      msgForEveryoneId = res2.body.data.message.id;
    });

    it('delete for me hides message from caller but retains for recipient', async () => {
      // Alice deletes msgForMeId for herself
      const delRes = await request(app)
        .delete(`/api/v1/messages/${msgForMeId}`)
        .set('Authorization', `Bearer ${aliceToken}`)
        .send({ mode: 'me' });

      expect(delRes.status).toBe(200);
      expect(delRes.body.data.deleteType).toBe('me');

      // Alice's chat messages does NOT contain msgForMeId
      const aliceGet = await request(app)
        .get(`/api/v1/chats/${directChatId}/messages`)
        .set('Authorization', `Bearer ${aliceToken}`);
      const foundInAlice = aliceGet.body.data.messages.some((m: any) => m.id === msgForMeId);
      expect(foundInAlice).toBe(false);

      // Bob's chat messages DOES still contain msgForMeId
      const bobGet = await request(app)
        .get(`/api/v1/chats/${directChatId}/messages`)
        .set('Authorization', `Bearer ${bobToken}`);
      const foundInBob = bobGet.body.data.messages.some((m: any) => m.id === msgForMeId);
      expect(foundInBob).toBe(true);
    });

    it('delete for everyone fails if non-author regular member attempts it', async () => {
      const res = await request(app)
        .delete(`/api/v1/messages/${msgForEveryoneId}`)
        .set('Authorization', `Bearer ${bobToken}`)
        .send({ mode: 'everyone' });

      expect(res.status).toBe(403);
      expect(res.body.error.code).toBe('INSUFFICIENT_PERMISSIONS');
    });

    it('delete for everyone succeeds for author and removes from chat messages', async () => {
      const res = await request(app)
        .delete(`/api/v1/messages/${msgForEveryoneId}`)
        .set('Authorization', `Bearer ${aliceToken}`)
        .send({ mode: 'everyone' });

      expect(res.status).toBe(200);
      expect(res.body.data.deleteType).toBe('everyone');

      // Both Alice and Bob should no longer see it in active messages
      const aliceGet = await request(app)
        .get(`/api/v1/chats/${directChatId}/messages`)
        .set('Authorization', `Bearer ${aliceToken}`);
      expect(aliceGet.body.data.messages.some((m: any) => m.id === msgForEveryoneId)).toBe(false);

      const bobGet = await request(app)
        .get(`/api/v1/chats/${directChatId}/messages`)
        .set('Authorization', `Bearer ${bobToken}`);
      expect(bobGet.body.data.messages.some((m: any) => m.id === msgForEveryoneId)).toBe(false);
    });

    it('group owner / admin can delete any member message for everyone in group', async () => {
      // Bob sends message in groupChatId
      const grpMsg = await request(app)
        .post(`/api/v1/chats/${groupChatId}/messages`)
        .set('Authorization', `Bearer ${bobToken}`)
        .send({ content: 'Spam from Bob in group' });
      const bobMsgId = grpMsg.body.data.message.id;

      // Alice (owner of groupChatId) deletes Bob's message for everyone
      const res = await request(app)
        .delete(`/api/v1/messages/${bobMsgId}`)
        .set('Authorization', `Bearer ${aliceToken}`)
        .send({ mode: 'everyone' });

      expect(res.status).toBe(200);
      expect(res.body.data.deleteType).toBe('everyone');
    });
  });
});
