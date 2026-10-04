import request from 'supertest';
import http from 'http';
import { io as Client, Socket as ClientSocket } from 'socket.io-client';
import { createApp } from '../app';
import pool from '../config/database';
import redis from '../config/redis';
import { initSocketIO, closeSocketIO } from '../sockets';

describe('Voice & Video Calling (WebRTC & Signaling) Integration Tests', () => {
  let app: ReturnType<typeof createApp>;
  let httpServer: http.Server;
  let serverPort: number;

  let aliceToken = '';
  let aliceId = '';
  let bobToken = '';
  let bobId = '';

  let aliceSocket: ClientSocket;
  let bobSocket: ClientSocket;

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

    // Register Alice
    const resA = await request(app)
      .post('/api/v1/auth/register')
      .send({
        username: `call_alice_${timestamp}`,
        email: `call_alice_${timestamp}@beacon.chat`,
        password: 'Password123!',
        displayName: 'Call Alice',
      });
    aliceToken = resA.body.data.accessToken;
    aliceId = resA.body.data.user.id;

    // Register Bob
    const resB = await request(app)
      .post('/api/v1/auth/register')
      .send({
        username: `call_bob_${timestamp}`,
        email: `call_bob_${timestamp}@beacon.chat`,
        password: 'Password123!',
        displayName: 'Call Bob',
      });
    bobToken = resB.body.data.accessToken;
    bobId = resB.body.data.user.id;

    // Connect Alice & Bob sockets
    await new Promise<void>((resolve) => {
      aliceSocket = Client(`http://localhost:${serverPort}`, {
        auth: { token: aliceToken },
        transports: ['websocket'],
      });
      aliceSocket.on('connect', () => resolve());
    });

    await new Promise<void>((resolve) => {
      bobSocket = Client(`http://localhost:${serverPort}`, {
        auth: { token: bobToken },
        transports: ['websocket'],
      });
      bobSocket.on('connect', () => resolve());
    });
  });

  afterAll(async () => {
    if (aliceSocket && aliceSocket.connected) {
      aliceSocket.disconnect();
    }
    if (bobSocket && bobSocket.connected) {
      bobSocket.disconnect();
    }
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

  describe('REST Endpoints: ICE Servers & Call Logs', () => {
    it('returns 401 when fetching ice servers without token', async () => {
      const res = await request(app).get('/api/v1/calls/ice-servers');
      expect(res.status).toBe(401);
    });

    it('returns STUN/TURN ICE servers configuration when authenticated', async () => {
      const res = await request(app)
        .get('/api/v1/calls/ice-servers')
        .set('Authorization', `Bearer ${aliceToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.data.iceServers)).toBe(true);
      expect(res.body.data.iceServers.length).toBeGreaterThan(0);
      expect(res.body.data.iceServers[0].urls).toBeDefined();
    });

    it('validates call logging input and rejects self-calling', async () => {
      const res = await request(app)
        .post('/api/v1/calls/log')
        .set('Authorization', `Bearer ${aliceToken}`)
        .send({
          recipientId: aliceId,
          type: 'audio',
          status: 'completed',
        });

      expect(res.status).toBe(400);
    });

    it('logs a completed call and fetches it in user history', async () => {
      const logRes = await request(app)
        .post('/api/v1/calls/log')
        .set('Authorization', `Bearer ${aliceToken}`)
        .send({
          recipientId: bobId,
          type: 'video',
          status: 'completed',
          duration: 145,
        });

      expect(logRes.status).toBe(201);
      expect(logRes.body.success).toBe(true);
      expect(logRes.body.data.caller_id).toBe(aliceId);
      expect(logRes.body.data.recipient_id).toBe(bobId);
      expect(logRes.body.data.duration).toBe(145);
      expect(logRes.body.data.type).toBe('video');

      // Check Alice's call history
      const historyRes = await request(app)
        .get('/api/v1/calls/history')
        .set('Authorization', `Bearer ${aliceToken}`);

      expect(historyRes.status).toBe(200);
      expect(historyRes.body.success).toBe(true);
      expect(historyRes.body.data.calls.length).toBeGreaterThanOrEqual(1);
      const found = historyRes.body.data.calls.find((c: { id: string }) => c.id === logRes.body.data.id);
      expect(found).toBeDefined();
      expect(found.caller.username).toBeDefined();
      expect(found.recipient.username).toBeDefined();
    });
  });

  describe('Real-Time WebRTC Call Signaling via Socket.IO', () => {
    it('relays call:initiate offer from caller to recipient', (done) => {
      const dummyOffer = { type: 'offer', sdp: 'v=0\r\no=alice 12345 2 IN IP4 127.0.0.1\r\ns=-...' };

      bobSocket.once('call:incoming', (payload) => {
        expect(payload.callerId).toBe(aliceId);
        expect(payload.callType).toBe('video');
        expect(payload.offer).toEqual(dummyOffer);
        done();
      });

      aliceSocket.emit('call:initiate', {
        recipientId: bobId,
        callType: 'video',
        offer: dummyOffer,
      });
    });

    it('relays call:answer from recipient to caller', (done) => {
      const dummyAnswer = { type: 'answer', sdp: 'v=0\r\no=bob 67890 2 IN IP4 127.0.0.1\r\ns=-...' };

      aliceSocket.once('call:answered', (payload) => {
        expect(payload.recipientId).toBe(bobId);
        expect(payload.answer).toEqual(dummyAnswer);
        done();
      });

      bobSocket.emit('call:answer', {
        callerId: aliceId,
        answer: dummyAnswer,
      });
    });

    it('relays call:ice_candidate between peers', (done) => {
      const dummyCandidate = {
        candidate: 'candidate:1 1 UDP 2130706431 192.168.1.1 50000 typ host',
        sdpMid: '0',
        sdpMLineIndex: 0,
      };

      bobSocket.once('call:ice_candidate', (payload) => {
        expect(payload.senderId).toBe(aliceId);
        expect(payload.candidate).toEqual(dummyCandidate);
        done();
      });

      aliceSocket.emit('call:ice_candidate', {
        targetUserId: bobId,
        candidate: dummyCandidate,
      });
    });

    it('relays call:reject with reason', (done) => {
      aliceSocket.once('call:rejected', (payload) => {
        expect(payload.recipientId).toBe(bobId);
        expect(payload.reason).toBe('declined');
        done();
      });

      bobSocket.emit('call:reject', {
        callerId: aliceId,
        reason: 'declined',
      });
    });

    it('relays call:end and notifies peer', (done) => {
      bobSocket.once('call:ended', (payload) => {
        expect(payload.senderId).toBe(aliceId);
        expect(payload.duration).toBe(60);
        done();
      });

      aliceSocket.emit('call:end', {
        targetUserId: bobId,
        duration: 60,
        callType: 'audio',
      });
    });
  });
});
