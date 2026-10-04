export interface SignedPrekey {
  keyId: number;
  publicKey: string;
  signature: string;
}

export interface OneTimePrekey {
  keyId: number;
  publicKey: string;
}

export interface PrekeyBundle {
  userId: string;
  registrationId: number;
  identityKey: string;
  signedPrekey: SignedPrekey;
  oneTimePrekey: OneTimePrekey | null;
}

export interface RegisterKeysParams {
  userId: string;
  registrationId: number;
  identityKey: string;
  signedPrekey: SignedPrekey;
  oneTimePrekeys?: OneTimePrekey[];
}
