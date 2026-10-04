import request from 'supertest';
import http from 'http';
import { io as Client, Socket as ClientSocket } from 'socket.io-client';
import { createApp } from '../app';
import pool from '../config/database';
import { initSocketIO, closeSocketIO } from '../sockets';
import { AttachmentItem } from '../services/message.service';

describe('Module 8: Media & File Sharing Integration Tests', () => {
  let app: ReturnType<typeof createApp>;
  let httpServer: http.Server;
  let serverPort = 0;

  let user1Token = '';
  let user2Token = '';
  let user2Id = '';
  let testChatId = '';

  let uploadedImageKey = '';
  let uploadedPdfKey = '';

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
    const res1 = await request(app).post('/api/v1/auth/register').send({
      username: `media_u1_${timestamp}`,
      email: `media_u1_${timestamp}@beacon.chat`,
      password: 'Password123!',
      displayName: 'Media Sender',
    });
    user1Token = res1.body.data.accessToken;

    // Register User 2
    const res2 = await request(app).post('/api/v1/auth/register').send({
      username: `media_u2_${timestamp}`,
      email: `media_u2_${timestamp}@beacon.chat`,
      password: 'Password123!',
      displayName: 'Media Receiver',
    });
    user2Token = res2.body.data.accessToken;
    user2Id = res2.body.data.user.id;

    // Create direct chat between User 1 and User 2
    const chatRes = await request(app)
      .post('/api/v1/chats/direct')
      .set('Authorization', `Bearer ${user1Token}`)
      .send({ targetUserId: user2Id });
    testChatId = chatRes.body.data.chat.id;
  });

  afterAll(async () => {
    await closeSocketIO();
    await new Promise<void>((resolve) => httpServer.close(() => resolve()));
    await pool.end();
  });

  describe('POST /api/v1/media/upload', () => {
    it('rejects unauthenticated upload requests', async () => {
      const res = await request(app)
        .post('/api/v1/media/upload')
        .attach('file', Buffer.from('fake data'), 'test.png');
      expect(res.status).toBe(401);
    });

    it('rejects disallowed file types (e.g. executable .sh or .exe)', async () => {
      const res = await request(app)
        .post('/api/v1/media/upload')
        .set('Authorization', `Bearer ${user1Token}`)
        .attach('file', Buffer.from('#!/bin/sh\necho hack'), 'exploit.sh');

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('UNSUPPORTED_FILE_TYPE');
    });

    it('successfully uploads an image and returns storage details', async () => {
      // 1x1 transparent PNG buffer
      const pngBuffer = Buffer.from(
        'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=',
        'base64',
      );

      const res = await request(app)
        .post('/api/v1/media/upload')
        .set('Authorization', `Bearer ${user1Token}`)
        .attach('file', pngBuffer, { filename: 'sample_chart.png', contentType: 'image/png' });

      expect(res.status).toBe(201);
      expect(res.body.data.fileName).toBe('sample_chart.png');
      expect(res.body.data.type).toBe('image');
      expect(res.body.data.mimeType).toBe('image/png');
      expect(res.body.data.storageKey).toBeDefined();
      expect(res.body.data.publicUrl).toContain('/uploads/media/');

      uploadedImageKey = res.body.data.storageKey;
    });

    it('successfully uploads a PDF document and detects document type', async () => {
      const pdfBuffer = Buffer.from('%PDF-1.4 header and sample document stream %%EOF');

      const res = await request(app)
        .post('/api/v1/media/upload')
        .set('Authorization', `Bearer ${user1Token}`)
        .attach('file', pdfBuffer, {
          filename: 'spec_document.pdf',
          contentType: 'application/pdf',
        });

      expect(res.status).toBe(201);
      expect(res.body.data.fileName).toBe('spec_document.pdf');
      expect(res.body.data.type).toBe('document');
      expect(res.body.data.mimeType).toBe('application/pdf');

      uploadedPdfKey = res.body.data.storageKey;
    });
  });

  describe('GET /api/v1/media/file/:filename (Streaming & HTTP Range)', () => {
    it('returns 404 for non-existent files', async () => {
      const res = await request(app).get('/api/v1/media/file/non_existent_123.jpg');
      expect(res.status).toBe(404);
    });

    it('streams uploaded image with 200 and image/png Content-Type', async () => {
      const res = await request(app).get(`/api/v1/media/file/${uploadedImageKey}`);
      expect(res.status).toBe(200);
      expect(res.headers['content-type']).toBe('image/png');
      expect(res.headers['accept-ranges']).toBe('bytes');
      expect(res.body).toBeInstanceOf(Buffer);
    });

    it('supports HTTP 206 Partial Content for streaming (Range requests)', async () => {
      const res = await request(app)
        .get(`/api/v1/media/file/${uploadedPdfKey}`)
        .set('Range', 'bytes=0-10');

      expect(res.status).toBe(206);
      expect(res.headers['content-range']).toContain('bytes 0-10/');
      expect(res.headers['content-type']).toBe('application/pdf');
    });

    it('downloads file with Content-Disposition attachment', async () => {
      const res = await request(app).get(`/api/v1/media/download/${uploadedPdfKey}`);
      expect(res.status).toBe(200);
      expect(res.headers['content-disposition']).toContain('attachment');
    });
  });

  describe('Chat Messages with Media Attachments', () => {
    it('sends an image message in direct chat and persists attachments', async () => {
      const res = await request(app)
        .post(`/api/v1/chats/${testChatId}/messages`)
        .set('Authorization', `Bearer ${user1Token}`)
        .send({
          content: 'Here is the diagram',
          attachments: [
            {
              fileName: 'sample_chart.png',
              fileSize: 68,
              mimeType: 'image/png',
              storageKey: uploadedImageKey,
              width: 100,
              height: 100,
            },
          ],
        });

      expect(res.status).toBe(201);
      const msg = res.body.data.message;
      expect(msg.content).toBe('Here is the diagram');
      expect(msg.type).toBe('image');
      expect(msg.attachments).toHaveLength(1);
      expect(msg.attachments[0].fileName).toBe('sample_chart.png');
      expect(msg.attachments[0].storageKey).toBe(uploadedImageKey);
      expect(msg.attachments[0].publicUrl).toContain(uploadedImageKey);
    });

    it('retrieves attachments when reading chat history via GET messages', async () => {
      const res = await request(app)
        .get(`/api/v1/chats/${testChatId}/messages`)
        .set('Authorization', `Bearer ${user2Token}`);

      expect(res.status).toBe(200);
      const messages = res.body.data.messages;
      expect(messages.length).toBeGreaterThanOrEqual(1);

      const imageMsg = messages.find((m: { type: string }) => m.type === 'image');
      expect(imageMsg).toBeDefined();
      expect(imageMsg.attachments).toHaveLength(1);
      expect(imageMsg.attachments[0].fileName).toBe('sample_chart.png');
    });

    it('broadcasts message:new with attachments array over Socket.IO', (done) => {
      const clientSocket: ClientSocket = Client(`http://localhost:${serverPort}`, {
        auth: { token: user2Token },
        transports: ['websocket'],
        reconnection: false,
      });

      clientSocket.on('connect_error', (err) => {
        done(err);
      });

      clientSocket.on('connected', () => {
        clientSocket.emit('chat:join', testChatId, (joined: boolean) => {
          expect(joined).toBe(true);

          void request(app)
            .post(`/api/v1/chats/${testChatId}/messages`)
            .set('Authorization', `Bearer ${user1Token}`)
            .send({
              content: 'Attached PDF document',
              attachments: [
                {
                  fileName: 'spec_document.pdf',
                  fileSize: 45,
                  mimeType: 'application/pdf',
                  storageKey: uploadedPdfKey,
                },
              ],
            })
            .then((res) => {
              expect(res.status).toBe(201);
            })
            .catch((err: unknown) => {
              done(err);
            });
        });
      });

      clientSocket.on(
        'message:new',
        (msg: {
          chatId: string;
          type: string;
          content: string;
          attachments: AttachmentItem[];
        }) => {
          if (msg.content === 'Attached PDF document') {
            expect(msg.chatId).toBe(testChatId);
            expect(msg.type).toBe('document');
            expect(msg.attachments).toHaveLength(1);
            expect(msg.attachments[0].fileName).toBe('spec_document.pdf');
            clientSocket.close();
            done();
          }
        },
      );
    });
  });
});
