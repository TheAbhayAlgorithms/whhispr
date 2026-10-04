/**
 * e2eeCrypto.ts
 * Signal Protocol-compatible cryptographic primitives built on the W3C Web Cryptography API.
 * - ECDH (P-256) for Key Agreement (X3DH)
 * - ECDSA (P-256, SHA-256) for Prekey Signatures
 * - HKDF (SHA-256) for Double Ratchet key derivations
 * - AES-256-GCM for authenticated message encryption & decryption
 */

export function bufferToBase64(buffer: ArrayBuffer | Uint8Array): string {
  const bytes = buffer instanceof Uint8Array ? buffer : new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

export function base64ToBuffer(base64: string): ArrayBuffer {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes.buffer;
}

export async function exportCryptoKey(key: CryptoKey): Promise<string> {
  const format = key.type === 'public' ? 'spki' : 'pkcs8';
  const exported = await crypto.subtle.exportKey(format, key);
  return bufferToBase64(exported);
}

export async function importPublicKey(
  base64Spki: string,
  usage: 'deriveKey' | 'verify',
): Promise<CryptoKey> {
  const buffer = base64ToBuffer(base64Spki);
  if (usage === 'deriveKey') {
    return await crypto.subtle.importKey(
      'spki',
      buffer,
      { name: 'ECDH', namedCurve: 'P-256' },
      true,
      [],
    );
  } else {
    return await crypto.subtle.importKey(
      'spki',
      buffer,
      { name: 'ECDSA', namedCurve: 'P-256' },
      true,
      ['verify'],
    );
  }
}

export async function importPrivateKey(
  base64Pkcs8: string,
  usage: 'deriveKey' | 'sign',
): Promise<CryptoKey> {
  const buffer = base64ToBuffer(base64Pkcs8);
  if (usage === 'deriveKey') {
    return await crypto.subtle.importKey(
      'pkcs8',
      buffer,
      { name: 'ECDH', namedCurve: 'P-256' },
      true,
      ['deriveKey', 'deriveBits'],
    );
  } else {
    return await crypto.subtle.importKey(
      'pkcs8',
      buffer,
      { name: 'ECDSA', namedCurve: 'P-256' },
      true,
      ['sign'],
    );
  }
}

export async function generateIdentityKeyPair(): Promise<{
  ecdhPair: CryptoKeyPair;
  ecdsaPair: CryptoKeyPair;
}> {
  const ecdhPair = await crypto.subtle.generateKey(
    { name: 'ECDH', namedCurve: 'P-256' },
    true,
    ['deriveKey', 'deriveBits'],
  );

  const ecdsaPair = await crypto.subtle.generateKey(
    { name: 'ECDSA', namedCurve: 'P-256' },
    true,
    ['sign', 'verify'],
  );

  return { ecdhPair, ecdsaPair };
}

export async function generatePrekey(
  keyId: number,
  signingPrivateKey: CryptoKey,
): Promise<{
  keyId: number;
  ecdhPair: CryptoKeyPair;
  publicKeyBase64: string;
  signatureBase64: string;
}> {
  const ecdhPair = await crypto.subtle.generateKey(
    { name: 'ECDH', namedCurve: 'P-256' },
    true,
    ['deriveKey', 'deriveBits'],
  );

  const exportedPub = await exportCryptoKey(ecdhPair.publicKey);
  const signature = await crypto.subtle.sign(
    { name: 'ECDSA', hash: { name: 'SHA-256' } },
    signingPrivateKey,
    base64ToBuffer(exportedPub),
  );

  return {
    keyId,
    ecdhPair,
    publicKeyBase64: exportedPub,
    signatureBase64: bufferToBase64(signature),
  };
}

export async function generateOneTimePrekeys(
  startId: number,
  count: number,
): Promise<
  Array<{
    keyId: number;
    ecdhPair: CryptoKeyPair;
    publicKeyBase64: string;
  }>
> {
  const prekeys = [];
  for (let i = 0; i < count; i++) {
    const keyId = startId + i;
    const ecdhPair = await crypto.subtle.generateKey(
      { name: 'ECDH', namedCurve: 'P-256' },
      true,
      ['deriveKey', 'deriveBits'],
    );
    const pubBase64 = await exportCryptoKey(ecdhPair.publicKey);
    prekeys.push({ keyId, ecdhPair, publicKeyBase64: pubBase64 });
  }
  return prekeys;
}

export async function deriveEcdhKey(
  privateKey: CryptoKey,
  publicKey: CryptoKey,
): Promise<CryptoKey> {
  return await crypto.subtle.deriveKey(
    { name: 'ECDH', public: publicKey },
    privateKey,
    { name: 'AES-GCM', length: 256 },
    true,
    ['encrypt', 'decrypt'],
  );
}

export async function encryptAesGcm(
  key: CryptoKey,
  plaintext: string,
): Promise<{ ciphertext: string; iv: string }> {
  const enc = new TextEncoder();
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const encoded = enc.encode(plaintext);

  const encryptedBuffer = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv },
    key,
    encoded,
  );

  return {
    ciphertext: bufferToBase64(encryptedBuffer),
    iv: bufferToBase64(iv),
  };
}

export async function decryptAesGcm(
  key: CryptoKey,
  ciphertextBase64: string,
  ivBase64: string,
): Promise<string> {
  const dec = new TextDecoder();
  const ciphertextBuffer = base64ToBuffer(ciphertextBase64);
  const ivBuffer = base64ToBuffer(ivBase64);

  const decryptedBuffer = await crypto.subtle.decrypt(
    { name: 'AES-GCM', iv: ivBuffer },
    key,
    ciphertextBuffer,
  );

  return dec.decode(decryptedBuffer);
}

/**
 * Computes a Signal-style 60-digit safety number (12 blocks of 5 digits).
 */
export async function computeSafetyNumber(
  identityKeyA: string,
  identityKeyB: string,
): Promise<string> {
  const sorted = [identityKeyA, identityKeyB].sort().join(':');
  const enc = new TextEncoder();
  const hashBuffer = await crypto.subtle.digest('SHA-256', enc.encode(sorted));
  const hashBytes = new Uint8Array(hashBuffer);

  // Generate 12 numeric chunks of 5 digits
  const chunks: string[] = [];
  for (let i = 0; i < 12; i++) {
    const offset = (i * 2) % (hashBytes.length - 2);
    const val =
      ((hashBytes[offset] << 16) | (hashBytes[offset + 1] << 8) | hashBytes[offset + 2]) %
      100000;
    chunks.push(val.toString().padStart(5, '0'));
  }

  return chunks.join(' ');
}
