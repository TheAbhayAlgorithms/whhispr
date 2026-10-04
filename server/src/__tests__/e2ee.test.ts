import request from 'supertest';
import http from 'http';
import { createApp } from '../app';
import pool from '../config/database';
import redis from '../config/redis';
import { initSocketIO, closeSocketIO } from '../sockets';

describe('End-to-End Encryption (Signal Protocol Key Distribution) Tests', () => {
  let app: ReturnType<typeof createApp>;
  let httpServer: http.Server;

  let aliceToken = '';
  let aliceId = '';
  let bobToken = '';
  let bobId = '';

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
        username: `e2ee_alice_${timestamp}`,
        email: `e2ee_alice_${timestamp}@beacon.chat`,
        password: 'Password123!',
        displayName: 'E2EE Alice',
      });
    aliceToken = resA.body.data.accessToken;
    aliceId = resA.body.data.user.id;

    // Bob
    const resB = await request(app)
      .post('/api/v1/auth/register')
      .send({
        username: `e2ee_bob_${timestamp}`,
        email: `e2ee_bob_${timestamp}@beacon.chat`,
        password: 'Password123!',
        displayName: 'E2EE Bob',
      });
    bobToken = resB.body.data.accessToken;
    bobId = resB.body.data.user.id;
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

  describe('Key Registration & Prekey Bundles', () => {
    it('rejects unauthenticated request to register keys', async () => {
      const res = await request(app).post('/api/v1/e2ee/keys').send({
        registrationId: 1001,
        identityKey: 'identity-key-base64-test-1234567890',
        signedPrekey: {
          keyId: 1,
          publicKey: 'signed-prekey-public-key-base64-123456',
          signature: 'signed-prekey-signature-base64-123456',
        },
      });

      expect(res.status).toBe(401);
    });

    it('validates key payload schema', async () => {
      const res = await request(app)
        .post('/api/v1/e2ee/keys')
        .set('Authorization', `Bearer ${aliceToken}`)
        .send({
          registrationId: -5, // invalid
          identityKey: 'short',
        });

      expect(res.status).toBe(422);
    });

    it('successfully registers Alice identity key, signed prekey, and OTPK pool', async () => {
      const res = await request(app)
        .post('/api/v1/e2ee/keys')
        .set('Authorization', `Bearer ${aliceToken}`)
        .send({
          registrationId: 4210,
          identityKey: 'MFkwEwYHKoZIzj0CAQYIKoZIzj0DAQcDQgAEaliceidentitykey1234567890',
          signedPrekey: {
            keyId: 1,
            publicKey: 'MFkwEwYHKoZIzj0CAQYIKoZIzj0DAQcDQgAEalicesignedprekey1234567890',
            signature: 'MEYCIQCalicesignature1234567890alicesignature1234567890alice==',
          },
          oneTimePrekeys: [
            { keyId: 101, publicKey: 'MFkwEwYHKoZIzj0CAQYIKoZIzj0DAQcDQgAEaliceotpk1011234567890' },
            { keyId: 102, publicKey: 'MFkwEwYHKoZIzj0CAQYIKoZIzj0DAQcDQgAEaliceotpk1021234567890' },
            { keyId: 103, publicKey: 'MFkwEwYHKoZIzj0CAQYIKoZIzj0DAQcDQgAEaliceotpk1031234567890' },
          ],
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
    });

    it('returns accurate count of unused one-time prekeys for Alice', async () => {
      const res = await request(app)
        .get('/api/v1/e2ee/keys/count')
        .set('Authorization', `Bearer ${aliceToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.count).toBe(3);
    });

    it('returns 404 when requesting prekey bundle for unregistered user', async () => {
      const res = await request(app)
        .get(`/api/v1/e2ee/bundle/${bobId}`)
        .set('Authorization', `Bearer ${aliceToken}`);

      expect(res.status).toBe(404);
    });

    it('fetches Alice prekey bundle and atomically consumes an OTPK', async () => {
      const bundleRes = await request(app)
        .get(`/api/v1/e2ee/bundle/${aliceId}`)
        .set('Authorization', `Bearer ${bobToken}`);

      expect(bundleRes.status).toBe(200);
      expect(bundleRes.body.success).toBe(true);
      expect(bundleRes.body.data.userId).toBe(aliceId);
      expect(bundleRes.body.data.registrationId).toBe(4210);
      expect(bundleRes.body.data.identityKey).toContain('aliceidentity');
      expect(bundleRes.body.data.signedPrekey.keyId).toBe(1);
      expect(bundleRes.body.data.oneTimePrekey).not.toBeNull();
      expect(bundleRes.body.data.oneTimePrekey.keyId).toBe(101);

      // Verify Alice's unused count decreased to 2
      const countRes = await request(app)
        .get('/api/v1/e2ee/keys/count')
        .set('Authorization', `Bearer ${aliceToken}`);

      expect(countRes.body.data.count).toBe(2);
    });

    it('allows Alice to replenish one-time prekeys pool', async () => {
      const replenishRes = await request(app)
        .post('/api/v1/e2ee/keys/replenish')
        .set('Authorization', `Bearer ${aliceToken}`)
        .send({
          keys: [
            { keyId: 104, publicKey: 'MFkwEwYHKoZIzj0CAQYIKoZIzj0DAQcDQgAEaliceotpk1041234567890' },
            { keyId: 105, publicKey: 'MFkwEwYHKoZIzj0CAQYIKoZIzj0DAQcDQgAEaliceotpk1051234567890' },
          ],
        });

      expect(replenishRes.status).toBe(200);
      expect(replenishRes.body.data.added).toBe(2);

      // Total unused now: 2 + 2 = 4
      const countRes = await request(app)
        .get('/api/v1/e2ee/keys/count')
        .set('Authorization', `Bearer ${aliceToken}`);

      expect(countRes.body.data.count).toBe(4);
    });
  });
});
