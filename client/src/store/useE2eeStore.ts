import { create } from 'zustand';
import { apiRequest } from '../lib/api';
import {
  generateIdentityKeyPair,
  generatePrekey,
  generateOneTimePrekeys,
  exportCryptoKey,
  importPublicKey,
  deriveEcdhKey,
  encryptAesGcm,
  decryptAesGcm,
  computeSafetyNumber,
} from '../lib/e2eeCrypto';
import { PrekeyBundle, EncryptedEnvelope, E2eeSession } from '../types/e2ee';
import { useAuthStore } from './useAuthStore';

interface E2eeState {
  isInitialized: boolean;
  identityKeyBase64: string | null;
  registrationId: number | null;
  sessions: Record<string, E2eeSession>;
  sessionKeys: Record<string, CryptoKey>;
  e2eeChatEnabled: Record<string, boolean>;
  activeSafetyModalPeer: {
    peerId: string;
    peerName: string;
    safetyNumber: string;
  } | null;

  init: () => Promise<void>;
  getOrCreateSession: (peerUserId: string) => Promise<{ key: CryptoKey; session: E2eeSession }>;
  encryptMessage: (recipientId: string, plaintext: string) => Promise<string>;
  decryptMessage: (envelopeJson: string, fallbackSenderId: string) => Promise<string>;
  toggleChatE2ee: (chatId: string) => void;
  openSafetyNumberModal: (peerId: string, peerName: string) => Promise<void>;
  closeSafetyNumberModal: () => void;
}

// In-memory identity private key cache for current session
let localEcdhPrivKey: CryptoKey | null = null;

export const useE2eeStore = create<E2eeState>((set, get) => ({
  isInitialized: false,
  identityKeyBase64: null,
  registrationId: null,
  sessions: {},
  sessionKeys: {},
  e2eeChatEnabled: {},
  activeSafetyModalPeer: null,

  init: async () => {
    const currentUser = useAuthStore.getState().user;
    if (!currentUser || get().isInitialized) return;

    try {
      // 1. Generate local Identity Keys & Prekeys
      const { ecdhPair, ecdsaPair } = await generateIdentityKeyPair();
      localEcdhPrivKey = ecdhPair.privateKey;

      const identityKeyBase64 = await exportCryptoKey(ecdhPair.publicKey);
      const registrationId = Math.floor(Math.random() * 1000000) + 1;

      // 2. Generate signed prekey
      const signedPrekey = await generatePrekey(1, ecdsaPair.privateKey);

      // 3. Generate initial batch of 20 One-Time Prekeys
      const otpks = await generateOneTimePrekeys(100, 20);

      // 4. Publish keys to Beacon server
      await apiRequest('/api/v1/e2ee/keys', {
        method: 'POST',
        body: JSON.stringify({
          registrationId,
          identityKey: identityKeyBase64,
          signedPrekey: {
            keyId: signedPrekey.keyId,
            publicKey: signedPrekey.publicKeyBase64,
            signature: signedPrekey.signatureBase64,
          },
          oneTimePrekeys: otpks.map((k) => ({
            keyId: k.keyId,
            publicKey: k.publicKeyBase64,
          })),
        }),
      });

      set({
        isInitialized: true,
        identityKeyBase64,
        registrationId,
      });
    } catch (err) {
      console.warn('Failed to initialize E2EE identity keys:', err);
    }
  },

  getOrCreateSession: async (peerUserId: string) => {
    const { sessionKeys, sessions, identityKeyBase64 } = get();

    if (sessionKeys[peerUserId] && sessions[peerUserId]) {
      return { key: sessionKeys[peerUserId], session: sessions[peerUserId] };
    }

    if (!localEcdhPrivKey) {
      await get().init();
    }

    // Fetch peer's Prekey bundle
    const res = await apiRequest<{ success: boolean; data: PrekeyBundle }>(
      `/api/v1/e2ee/bundle/${peerUserId}`,
    );
    const bundle = res.data;

    // Import peer's key (using signedPrekey or OTPK)
    const targetKeyBase64 = bundle.oneTimePrekey
      ? bundle.oneTimePrekey.publicKey
      : bundle.signedPrekey.publicKey;

    const peerPublicKey = await importPublicKey(targetKeyBase64, 'deriveKey');

    // Derive symmetric encryption key via ECDH
    const derivedKey = await deriveEcdhKey(localEcdhPrivKey!, peerPublicKey);

    // Compute safety number between our identity key and peer's identity key
    const safetyNumber = await computeSafetyNumber(
      identityKeyBase64 || 'local-key',
      bundle.identityKey,
    );

    const session: E2eeSession = {
      peerId: peerUserId,
      sharedSecret: targetKeyBase64,
      rootKey: targetKeyBase64,
      sendChainKey: targetKeyBase64,
      receiveChainKey: targetKeyBase64,
      sendCount: 0,
      receiveCount: 0,
      peerIdentityKey: bundle.identityKey,
      safetyNumber,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    set((state) => ({
      sessions: { ...state.sessions, [peerUserId]: session },
      sessionKeys: { ...state.sessionKeys, [peerUserId]: derivedKey },
    }));

    return { key: derivedKey, session };
  },

  encryptMessage: async (recipientId: string, plaintext: string): Promise<string> => {
    const currentUser = useAuthStore.getState().user;
    const { key, session } = await get().getOrCreateSession(recipientId);

    const { ciphertext, iv } = await encryptAesGcm(key, plaintext);

    const envelope: EncryptedEnvelope = {
      e2ee: true,
      version: 1,
      senderId: currentUser?.id || '',
      recipientId,
      senderEphemeralKey: get().identityKeyBase64 || '',
      iv,
      ciphertext,
      messageNumber: session.sendCount + 1,
      previousChainLength: session.sendCount,
      safetyNumber: session.safetyNumber,
    };

    return JSON.stringify(envelope);
  },

  decryptMessage: async (envelopeJson: string, fallbackSenderId: string): Promise<string> => {
    try {
      if (!envelopeJson || !envelopeJson.startsWith('{') || !envelopeJson.includes('"e2ee":true')) {
        return envelopeJson; // Plain text message
      }

      const envelope = JSON.parse(envelopeJson) as EncryptedEnvelope;
      if (!envelope.e2ee || !envelope.ciphertext || !envelope.iv) {
        return envelopeJson;
      }

      const currentUser = useAuthStore.getState().user;
      const peerId =
        envelope.senderId && envelope.senderId !== currentUser?.id
          ? envelope.senderId
          : envelope.recipientId || fallbackSenderId;
      const { key } = await get().getOrCreateSession(peerId);

      return await decryptAesGcm(key, envelope.ciphertext, envelope.iv);
    } catch {
      // If decryption fails (e.g. key mismatch or refreshed session), return safe indicator instead of raw JSON
      if (envelopeJson && envelopeJson.startsWith('{') && envelopeJson.includes('"e2ee":true')) {
        return '🔒 Encrypted message';
      }
      return envelopeJson;
    }
  },

  toggleChatE2ee: (chatId: string) => {
    set((state) => ({
      e2eeChatEnabled: {
        ...state.e2eeChatEnabled,
        [chatId]: !state.e2eeChatEnabled[chatId],
      },
    }));
  },

  openSafetyNumberModal: async (peerId: string, peerName: string) => {
    const { session } = await get().getOrCreateSession(peerId);
    set({
      activeSafetyModalPeer: {
        peerId,
        peerName,
        safetyNumber: session.safetyNumber,
      },
    });
  },

  closeSafetyNumberModal: () => {
    set({ activeSafetyModalPeer: null });
  },
}));
