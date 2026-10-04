import request from 'supertest';
import http from 'http';
import { io as Client, Socket as ClientSocket } from 'socket.io-client';
import { createApp } from '../app';
import pool from '../config/database';
import { initSocketIO, closeSocketIO } from '../sockets';

describe('Module 7: Group Messaging & Channels Integration Tests', () => {
  let app: ReturnType<typeof createApp>;
  let httpServer: http.Server;
  let serverPort = 0;

  let ownerToken = '';
  let ownerId = '';
  let adminToken = '';
  let adminId = '';
  let memberToken = '';
  let memberId = '';
  let outsiderToken = '';
  let outsiderId = '';

  let testGroupId = '';
  let testChannelId = '';

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

    // Clean up test tables if needed
    await pool.query('DELETE FROM refresh_tokens');

    // Register Owner
    const res1 = await request(app).post('/api/v1/auth/register').send({
      username: `grp_owner_${timestamp}`,
      email: `grp_owner_${timestamp}@beacon.chat`,
      password: 'Password123!',
      displayName: 'Group Owner',
    });
    ownerToken = res1.body.data.accessToken;
    ownerId = res1.body.data.user.id;

    // Register Admin candidate
    const res2 = await request(app).post('/api/v1/auth/register').send({
      username: `grp_admin_${timestamp}`,
      email: `grp_admin_${timestamp}@beacon.chat`,
      password: 'Password123!',
      displayName: 'Group Admin',
    });
    adminToken = res2.body.data.accessToken;
    adminId = res2.body.data.user.id;

    // Register Member candidate
    const res3 = await request(app).post('/api/v1/auth/register').send({
      username: `grp_member_${timestamp}`,
      email: `grp_member_${timestamp}@beacon.chat`,
      password: 'Password123!',
      displayName: 'Group Member',
    });
    memberToken = res3.body.data.accessToken;
    memberId = res3.body.data.user.id;

    // Register Outsider
    const res4 = await request(app).post('/api/v1/auth/register').send({
      username: `grp_outsider_${timestamp}`,
      email: `grp_outsider_${timestamp}@beacon.chat`,
      password: 'Password123!',
      displayName: 'Outsider',
    });
    outsiderToken = res4.body.data.accessToken;
    outsiderId = res4.body.data.user.id;
  });

  afterAll(async () => {
    await closeSocketIO();
    await new Promise<void>((resolve) => httpServer.close(() => resolve()));
    await pool.end();
  });

  describe('POST /api/v1/groups (Create Group)', () => {
    it('fails when unauthenticated', async () => {
      const res = await request(app)
        .post('/api/v1/groups')
        .send({ name: 'Engineering Team' });
      expect(res.status).toBe(401);
    });

    it('validates name length', async () => {
      const res = await request(app)
        .post('/api/v1/groups')
        .set('Authorization', `Bearer ${ownerToken}`)
        .send({ name: 'A' });
      expect(res.status).toBe(422);
    });

    it('creates a group with creator as owner and initial members', async () => {
      const res = await request(app)
        .post('/api/v1/groups')
        .set('Authorization', `Bearer ${ownerToken}`)
        .send({
          name: 'Beacon Core Team',
          description: 'Core product architecture discussion',
          memberIds: [adminId, memberId],
        });

      expect(res.status).toBe(201);
      expect(res.body.data.name).toBe('Beacon Core Team');
      expect(res.body.data.type).toBe('group');
      expect(res.body.data.callerRole).toBe('owner');
      expect(res.body.data.membersCount).toBe(3);

      testGroupId = res.body.data.id;
    });
  });

  describe('POST /api/v1/groups/channels (Create Channel)', () => {
    it('creates a public channel', async () => {
      const res = await request(app)
        .post('/api/v1/groups/channels')
        .set('Authorization', `Bearer ${ownerToken}`)
        .send({
          name: 'announcements',
          description: 'Company-wide updates and alerts',
          isPublic: true,
        });

      expect(res.status).toBe(201);
      expect(res.body.data.name).toBe('announcements');
      expect(res.body.data.type).toBe('channel');
      expect(res.body.data.isPublic).toBe(true);
      expect(res.body.data.callerRole).toBe('owner');

      testChannelId = res.body.data.id;
    });
  });

  describe('GET /api/v1/groups/channels/public (Public Channel Discovery)', () => {
    it('lists public channels with member count and join status', async () => {
      const res = await request(app)
        .get('/api/v1/groups/channels/public')
        .set('Authorization', `Bearer ${outsiderToken}`);

      expect(res.status).toBe(200);
      expect(Array.isArray(res.body.data)).toBe(true);
      const found = res.body.data.find((c: { id: string }) => c.id === testChannelId);
      expect(found).toBeDefined();
      expect(found.isJoined).toBe(false);
      expect(found.memberCount).toBeGreaterThanOrEqual(1);
    });

    it('allows an outsider to join a public channel openly', async () => {
      const res = await request(app)
        .post(`/api/v1/groups/channels/${testChannelId}/join`)
        .set('Authorization', `Bearer ${outsiderToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.callerRole).toBe('member');
      expect(res.body.data.membersCount).toBe(2);
    });
  });

  describe('GET /api/v1/groups/:chatId/details', () => {
    it('returns group details and member roster', async () => {
      const res = await request(app)
        .get(`/api/v1/groups/${testGroupId}/details`)
        .set('Authorization', `Bearer ${ownerToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.id).toBe(testGroupId);
      expect(res.body.data.members).toHaveLength(3);
      expect(res.body.data.members[0].role).toBe('owner');
    });

    it('forbids non-members from viewing private group details', async () => {
      const res = await request(app)
        .get(`/api/v1/groups/${testGroupId}/details`)
        .set('Authorization', `Bearer ${outsiderToken}`);

      expect(res.status).toBe(403);
    });
  });

  describe('Role Management & Permissions', () => {
    it('allows owner to promote a member to admin', async () => {
      const res = await request(app)
        .patch(`/api/v1/groups/${testGroupId}/members/${adminId}/role`)
        .set('Authorization', `Bearer ${ownerToken}`)
        .send({ role: 'admin' });

      expect(res.status).toBe(200);
      const adminMember = res.body.data.members.find((m: { userId: string }) => m.userId === adminId);
      expect(adminMember.role).toBe('admin');
    });

    it('prevents regular members from changing roles', async () => {
      const res = await request(app)
        .patch(`/api/v1/groups/${testGroupId}/members/${adminId}/role`)
        .set('Authorization', `Bearer ${memberToken}`)
        .send({ role: 'member' });

      expect(res.status).toBe(403);
    });

    it('allows admin to add new members to group', async () => {
      const res = await request(app)
        .post(`/api/v1/groups/${testGroupId}/members`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ memberIds: [outsiderId] });

      expect(res.status).toBe(200);
      expect(res.body.data.membersCount).toBe(4);
    });

    it('prevents regular members from kicking other members', async () => {
      const res = await request(app)
        .delete(`/api/v1/groups/${testGroupId}/members/${outsiderId}`)
        .set('Authorization', `Bearer ${memberToken}`);

      expect(res.status).toBe(403);
    });

    it('prevents admin from kicking the owner', async () => {
      const res = await request(app)
        .delete(`/api/v1/groups/${testGroupId}/members/${ownerId}`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(403);
    });

    it('allows admin to kick a regular member', async () => {
      const res = await request(app)
        .delete(`/api/v1/groups/${testGroupId}/members/${outsiderId}`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.membersCount).toBe(3);
    });
  });

  describe('PATCH /api/v1/groups/:chatId (Update Group Metadata)', () => {
    it('allows admin or owner to update group name and description', async () => {
      const res = await request(app)
        .patch(`/api/v1/groups/${testGroupId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          name: 'Beacon Core Team (Updated)',
          description: 'Refined team mission',
        });

      expect(res.status).toBe(200);
      expect(res.body.data.name).toBe('Beacon Core Team (Updated)');
      expect(res.body.data.description).toBe('Refined team mission');
    });

    it('forbids normal members from updating group settings', async () => {
      const res = await request(app)
        .patch(`/api/v1/groups/${testGroupId}`)
        .set('Authorization', `Bearer ${memberToken}`)
        .send({ name: 'Hacked Name' });

      expect(res.status).toBe(403);
    });
  });

  describe('POST /api/v1/groups/:chatId/leave (Leave Group & Ownership Handover)', () => {
    it('allows a member to leave the group', async () => {
      const res = await request(app)
        .post(`/api/v1/groups/${testGroupId}/leave`)
        .set('Authorization', `Bearer ${memberToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.success).toBe(true);

      // Verify member count decreased
      const details = await request(app)
        .get(`/api/v1/groups/${testGroupId}/details`)
        .set('Authorization', `Bearer ${ownerToken}`);
      expect(details.body.data.membersCount).toBe(2);
    });

    it('transfers ownership to the next admin when owner leaves', async () => {
      const res = await request(app)
        .post(`/api/v1/groups/${testGroupId}/leave`)
        .set('Authorization', `Bearer ${ownerToken}`);

      expect(res.status).toBe(200);

      // Check details as remaining admin
      const details = await request(app)
        .get(`/api/v1/groups/${testGroupId}/details`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(details.status).toBe(200);
      expect(details.body.data.callerRole).toBe('owner');
    });
  });

  describe('Real-Time Group Events over Socket.IO', () => {
    it('broadcasts group:member_joined and system message when a member joins', (done) => {
      const clientSocket: ClientSocket = Client(`http://localhost:${serverPort}`, {
        auth: { token: adminToken },
        transports: ['websocket'],
        reconnection: false,
      });

      clientSocket.on('connect_error', (err) => {
        done(err);
      });

      clientSocket.on('connected', () => {
        clientSocket.emit('chat:join', testGroupId, (joined: boolean) => {
          expect(joined).toBe(true);

          void request(app)
            .post(`/api/v1/groups/${testGroupId}/members`)
            .set('Authorization', `Bearer ${adminToken}`)
            .send({ memberIds: [memberId] })
            .then((res) => {
              expect(res.status).toBe(200);
            })
            .catch((err: unknown) => {
              done(err);
            });
        });
      });

      clientSocket.on('group:member_joined', (event: { chatId: string; memberIds: string[] }) => {
        expect(event.chatId).toBe(testGroupId);
        expect(event.memberIds).toContain(memberId);
        clientSocket.close();
        done();
      });
    });
  });
});
