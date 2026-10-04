import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  generateIdentityKeyPair,
  generatePrekey,
  generateOneTimePrekeys,
  deriveEcdhKey,
  encryptAesGcm,
  decryptAesGcm,
  computeSafetyNumber,
  exportCryptoKey,
} from '../lib/e2eeCrypto';
import { useE2eeStore } from '../store/useE2eeStore';
import * as apiModule from '../lib/api';

vi.mock('../lib/api', () => ({
  apiRequest: vi.fn(),
}));

vi.mock('../store/useAuthStore', () => ({
  useAuthStore: {
    getState: () => ({
      user: {
        id: 'u-alice-1',
        username: 'alice',
      },
    }),
  },
}));

describe('Signal Protocol E2EE Cryptographic Engine Tests', () => {
  it('generates identity key pairs for ECDH and ECDSA', async () => {
    const { ecdhPair, ecdsaPair } = await generateIdentityKeyPair();
    expect(ecdhPair.publicKey).toBeDefined();
    expect(ecdhPair.privateKey).toBeDefined();
    expect(ecdsaPair.publicKey).toBeDefined();
    expect(ecdsaPair.privateKey).toBeDefined();
  });

  it('generates signed prekey and verifiable signature', async () => {
    const { ecdsaPair } = await generateIdentityKeyPair();
    const prekey = await generatePrekey(1, ecdsaPair.privateKey);

    expect(prekey.keyId).toBe(1);
    expect(prekey.publicKeyBase64).toBeDefined();
    expect(prekey.signatureBase64).toBeDefined();
  });

  it('generates pool of One-Time Prekeys (OTPKs)', async () => {
    const otpks = await generateOneTimePrekeys(100, 5);
    expect(otpks).toHaveLength(5);
    expect(otpks[0].keyId).toBe(100);
    expect(otpks[4].keyId).toBe(104);
  });

  it('performs Diffie-Hellman key exchange and verifies commutativity', async () => {
    const alice = await generateIdentityKeyPair();
    const bob = await generateIdentityKeyPair();

    const aliceDerivedKey = await deriveEcdhKey(alice.ecdhPair.privateKey, bob.ecdhPair.publicKey);
    const bobDerivedKey = await deriveEcdhKey(bob.ecdhPair.privateKey, alice.ecdhPair.publicKey);

    const secretMessage = 'Top secret rendezvous at dawn';
    const { ciphertext, iv } = await encryptAesGcm(aliceDerivedKey, secretMessage);

    const decrypted = await decryptAesGcm(bobDerivedKey, ciphertext, iv);
    expect(decrypted).toBe(secretMessage);
  });

  it('computes 60-digit safety number and verifies commutativity', async () => {
    const keyA = 'MFkwEwYHKoZIzj0CAQYIKoZIzj0DAQcDQgAEalice1234567890';
    const keyB = 'MFkwEwYHKoZIzj0CAQYIKoZIzj0DAQcDQgAEbob123456789012';

    const safetyA = await computeSafetyNumber(keyA, keyB);
    const safetyB = await computeSafetyNumber(keyB, keyA);

    expect(safetyA).toBe(safetyB);
    const blocks = safetyA.split(' ');
    expect(blocks).toHaveLength(12);
    blocks.forEach((block) => {
      expect(block).toHaveLength(5);
      expect(/^\d{5}$/.test(block)).toBe(true);
    });
  });
});

describe('useE2eeStore Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('initializes and registers user keys with backend', async () => {
    vi.mocked(apiModule.apiRequest).mockResolvedValueOnce({ success: true });

    await useE2eeStore.getState().init();

    expect(apiModule.apiRequest).toHaveBeenCalledWith(
      '/api/v1/e2ee/keys',
      expect.objectContaining({ method: 'POST' }),
    );
    expect(useE2eeStore.getState().isInitialized).toBe(true);
    expect(useE2eeStore.getState().identityKeyBase64).toBeDefined();
  });

  it('encrypts and decrypts messages end-to-end', async () => {
    const bob = await generateIdentityKeyPair();
    const bobPubBase64 = await exportCryptoKey(bob.ecdhPair.publicKey);

    // Mock bundle response for Bob
    vi.mocked(apiModule.apiRequest).mockResolvedValueOnce({
      success: true,
      data: {
        userId: 'u-bob-2',
        registrationId: 5555,
        identityKey: bobPubBase64,
        signedPrekey: { keyId: 1, publicKey: bobPubBase64, signature: 'sig==' },
        oneTimePrekey: null,
      },
    });

    const plaintext = 'Beacon quantum encrypted transmission';
    const envelopeJson = await useE2eeStore.getState().encryptMessage('u-bob-2', plaintext);

    expect(envelopeJson).toContain('"e2ee":true');
    expect(envelopeJson).toContain('"recipientId":"u-bob-2"');

    const decrypted = await useE2eeStore.getState().decryptMessage(envelopeJson, 'u-bob-2');
    expect(decrypted).toBe(plaintext);
  });
});
