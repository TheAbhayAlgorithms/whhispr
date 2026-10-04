-- ============================================================
-- Migration 009: End-to-End Encryption (Signal Protocol Keys)
-- ============================================================

-- Identity Keys (Long-term identity per user)
CREATE TABLE e2ee_identity_keys (
  user_id         UUID        PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  registration_id INTEGER     NOT NULL,
  identity_key    TEXT        NOT NULL, -- Base64 encoded public identity key
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Signed Pre-keys (Medium-term pre-key with cryptographic signature)
CREATE TABLE e2ee_signed_prekeys (
  id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  key_id          INTEGER     NOT NULL,
  public_key      TEXT        NOT NULL,
  signature       TEXT        NOT NULL,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(user_id, key_id)
);

-- One-Time Pre-keys (Pool of single-use keys consumed on session init)
CREATE TABLE e2ee_one_time_prekeys (
  id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  key_id          INTEGER     NOT NULL,
  public_key      TEXT        NOT NULL,
  is_used         BOOLEAN     NOT NULL DEFAULT FALSE,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(user_id, key_id)
);

CREATE INDEX idx_e2ee_signed_prekeys_user ON e2ee_signed_prekeys(user_id);
CREATE INDEX idx_e2ee_otpk_user_unused ON e2ee_one_time_prekeys(user_id, is_used);
