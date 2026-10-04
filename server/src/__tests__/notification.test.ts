import request from 'supertest';
import http from 'http';
import { io as Client, Socket as ClientSocket } from 'socket.io-client';
import { createApp } from '../app';
import pool from '../config/database';
import redis from '../config/redis';
import { initSocketIO, closeSocketIO } from '../sockets';
import { NotificationService } from '../services/notification.service';

describe('Notifications (Push & In-App) Integration Tests', () => {
  let app: ReturnType<typeof createApp>;
  let httpServer: http.Server;
  let serverPort: number;

  let aliceToken = '';
  let aliceId = '';
  let aliceSocket: ClientSocket;

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
        username: `notif_alice_${timestamp}`,
        email: `notif_alice_${timestamp}@beacon.chat`,
        password: 'Password123!',
        displayName: 'Notification Alice',
      });
    aliceToken = resA.body.data.accessToken;
    aliceId = resA.body.data.user.id;

    // Connect Alice Socket
    await new Promise<void>((resolve) => {
      aliceSocket = Client(`http://localhost:${serverPort}`, {
        auth: { token: aliceToken },
        transports: ['websocket'],
      });
      aliceSocket.on('connect', () => resolve());
    });
  });

  afterAll(async () => {
    if (aliceSocket && aliceSocket.connected) {
      aliceSocket.disconnect();
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

  describe('REST Endpoints: VAPID & Push Subscriptions', () => {
    it('returns 401 when accessing notifications without auth', async () => {
      const res = await request(app).get('/api/v1/notifications');
      expect(res.status).toBe(401);
    });

    it('returns VAPID public key', async () => {
      const res = await request(app)
        .get('/api/v1/notifications/push/vapid-key')
        .set('Authorization', `Bearer ${aliceToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.vapidPublicKey).toBeDefined();
    });

    it('registers and removes a Web Push subscription', async () => {
      const subRes = await request(app)
        .post('/api/v1/notifications/push/subscribe')
        .set('Authorization', `Bearer ${aliceToken}`)
        .send({
          endpoint: 'https://fcm.googleapis.com/fcm/send/test-endpoint-alice-12345',
          p256dh: 'BNcRdreALRFXTkOOUHK1EtK2wtaz5Ry4YfYCA_0QT9t0A3qcVajSOMg4qCX6D4W2',
          auth: 'tBHItJI5svbpez7KI4CCXg==',
          userAgent: 'Mozilla/5.0 Test Browser',
        });

      expect(subRes.status).toBe(201);
      expect(subRes.body.success).toBe(true);

      const unsubRes = await request(app)
        .delete('/api/v1/notifications/push/unsubscribe')
        .set('Authorization', `Bearer ${aliceToken}`)
        .send({
          endpoint: 'https://fcm.googleapis.com/fcm/send/test-endpoint-alice-12345',
        });

      expect(unsubRes.status).toBe(200);
      expect(unsubRes.body.success).toBe(true);
    });
  });

  describe('In-App Notification Lifecycle & Real-Time Socket Delivery', () => {
    let createdNotificationId = '';

    it('delivers real-time notification via Socket.IO when created', (done) => {
      aliceSocket.once('notification:new', (notif) => {
        expect(notif.user_id).toBe(aliceId);
        expect(notif.type).toBe('contact_request');
        expect(notif.title).toBe('New Contact Request');
        createdNotificationId = notif.id;
        done();
      });

      void NotificationService.createNotification({
        userId: aliceId,
        type: 'contact_request',
        title: 'New Contact Request',
        body: 'Bob sent you a contact request',
        data: { senderId: '00000000-0000-0000-0000-000000000002' },
      });
    });

    it('retrieves user notifications list and unread count', async () => {
      const res = await request(app)
        .get('/api/v1/notifications')
        .set('Authorization', `Bearer ${aliceToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.notifications.length).toBeGreaterThanOrEqual(1);
      expect(res.body.data.unreadCount).toBeGreaterThanOrEqual(1);
      const found = res.body.data.notifications.find((n: { id: string }) => n.id === createdNotificationId);
      expect(found).toBeDefined();
      expect(found.is_read).toBe(false);
    });

    it('marks a single notification as read', async () => {
      const res = await request(app)
        .patch(`/api/v1/notifications/${createdNotificationId}/read`)
        .set('Authorization', `Bearer ${aliceToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.is_read).toBe(true);
      expect(res.body.data.read_at).toBeDefined();
    });

    it('creates multiple notifications and marks all as read', async () => {
      await NotificationService.createNotification({
        userId: aliceId,
        type: 'new_message',
        title: 'Message from Charlie',
        body: 'Hey Alice!',
      });
      await NotificationService.createNotification({
        userId: aliceId,
        type: 'mention',
        title: 'Mentioned in #general',
        body: '@alice check this out',
      });

      const beforeRes = await request(app)
        .get('/api/v1/notifications?unreadOnly=true')
        .set('Authorization', `Bearer ${aliceToken}`);
      expect(beforeRes.body.data.unreadCount).toBe(2);

      const readAllRes = await request(app)
        .patch('/api/v1/notifications/read-all')
        .set('Authorization', `Bearer ${aliceToken}`);

      expect(readAllRes.status).toBe(200);
      expect(readAllRes.body.data.updated).toBe(2);

      const afterRes = await request(app)
        .get('/api/v1/notifications?unreadOnly=true')
        .set('Authorization', `Bearer ${aliceToken}`);
      expect(afterRes.body.data.unreadCount).toBe(0);
    });

    it('deletes a notification by ID', async () => {
      const delRes = await request(app)
        .delete(`/api/v1/notifications/${createdNotificationId}`)
        .set('Authorization', `Bearer ${aliceToken}`);

      expect(delRes.status).toBe(200);
      expect(delRes.body.success).toBe(true);

      // Verify it's deleted
      const checkRes = await request(app)
        .patch(`/api/v1/notifications/${createdNotificationId}/read`)
        .set('Authorization', `Bearer ${aliceToken}`);

      expect(checkRes.status).toBe(404);
    });
  });
});
