import http from 'http';
import { io as Client, Socket as ClientSocket } from 'socket.io-client';
import jwt from 'jsonwebtoken';
import { createApp } from '../app';
import { env } from '../config/env';
import pool from '../config/database';
import redis from '../config/redis';
import { initSocketIO, closeSocketIO, getIO } from '../sockets';

describe('Real-Time Infrastructure (Socket.IO + Redis Adapter) Tests', () => {
  let httpServer: http.Server;
  let serverPort: number;
  let validToken: string;
  const testUserId = '00000000-0000-0000-0000-000000000001';
  const testUsername = 'socket_tester';

  beforeAll((done) => {
    validToken = jwt.sign(
      {
        userId: testUserId,
        username: testUsername,
        email: 'socket@beacon.chat',
        role: 'user',
      },
      env.JWT_ACCESS_SECRET,
      { expiresIn: '15m' },
    );

    const app = createApp();
    httpServer = http.createServer(app);
    initSocketIO(httpServer);

    httpServer.listen(0, () => {
      const addr = httpServer.address();
      if (addr && typeof addr === 'object') {
        serverPort = addr.port;
      }
      done();
    });
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

  it('rejects connection without token', (done) => {
    const client = Client(`http://localhost:${serverPort}`, {
      transports: ['websocket'],
      autoConnect: true,
      reconnection: false,
    });

    client.on('connect_error', (err) => {
      expect(err.message).toMatch(/Authentication error/);
      client.close();
      done();
    });
  });

  it('rejects connection with invalid token', (done) => {
    const client = Client(`http://localhost:${serverPort}`, {
      transports: ['websocket'],
      auth: { token: 'invalid.jwt.token' },
      autoConnect: true,
      reconnection: false,
    });

    client.on('connect_error', (err) => {
      expect(err.message).toMatch(/Authentication error/);
      client.close();
      done();
    });
  });

  it('successfully connects with valid JWT and receives connected event', (done) => {
    const client: ClientSocket = Client(`http://localhost:${serverPort}`, {
      transports: ['websocket'],
      auth: { token: validToken },
      autoConnect: true,
      reconnection: false,
    });

    client.on('connected', (data: { userId: string; socketId: string }) => {
      expect(data.userId).toBe(testUserId);
      expect(data.socketId).toBeDefined();
      client.close();
      done();
    });
  });

  it('responds to heartbeat ping', (done) => {
    const client: ClientSocket = Client(`http://localhost:${serverPort}`, {
      transports: ['websocket'],
      auth: { token: validToken },
      autoConnect: true,
      reconnection: false,
    });

    client.on('connected', () => {
      client.emit('heartbeat');
    });

    client.on('heartbeat:ack', (data: { timestamp: number }) => {
      expect(data.timestamp).toBeGreaterThan(0);
      client.close();
      done();
    });
  });

  it('delivers messages sent to the user private room', (done) => {
    const client: ClientSocket = Client(`http://localhost:${serverPort}`, {
      transports: ['websocket'],
      auth: { token: validToken },
      autoConnect: true,
      reconnection: false,
    });

    client.on('connected', () => {
      // Server emits targeted message to user room
      getIO().to(`user:${testUserId}`).emit('notification:test', {
        title: 'Room message',
      });
    });

    client.on('notification:test', (payload: { title: string }) => {
      expect(payload.title).toBe('Room message');
      client.close();
      done();
    });
  });

  it('queries presence status via socket', (done) => {
    const client: ClientSocket = Client(`http://localhost:${serverPort}`, {
      transports: ['websocket'],
      auth: { token: validToken },
      autoConnect: true,
      reconnection: false,
    });

    client.on('connected', () => {
      client.emit('presence:query', testUserId, (presence: { status: string; userId: string }) => {
        expect(presence.userId).toBe(testUserId);
        expect(['online', 'offline']).toContain(presence.status);
        client.close();
        done();
      });
    });
  });
});
