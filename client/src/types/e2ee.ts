export interface PrekeyBundle {
  userId: string;
  registrationId: number;
  identityKey: string;
  signedPrekey: {
    keyId: number;
    publicKey: string;
    signature: string;
  };
  oneTimePrekey: {
    keyId: number;
    publicKey: string;
  } | null;
}

export interface EncryptedEnvelope {
  e2ee: true;
  version: 1;
  senderId: string;
  recipientId: string;
  senderEphemeralKey: string;
  iv: string;
  ciphertext: string;
  messageNumber: number;
  previousChainLength: number;
  safetyNumber?: string;
}

export interface E2eeSession {
  peerId: string;
  sharedSecret: string;
  rootKey: string;
  sendChainKey: string;
  receiveChainKey: string;
  sendCount: number;
  receiveCount: number;
  peerIdentityKey: string;
  safetyNumber: string;
  isVerified?: boolean;
  createdAt: string;
  updatedAt: string;
}
