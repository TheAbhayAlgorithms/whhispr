-- ============================================================
-- Migration 002: Users & Profiles
-- ============================================================

-- Core user account (authentication data only)
CREATE TABLE users (
  id                UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  username          CITEXT       UNIQUE NOT NULL,
  email             CITEXT       UNIQUE NOT NULL,
  password_hash     TEXT         NOT NULL,
  is_email_verified BOOLEAN      NOT NULL DEFAULT FALSE,
  email_verify_token TEXT,
  email_verify_expires TIMESTAMPTZ,
  reset_password_token TEXT,
  reset_password_expires TIMESTAMPTZ,
  is_active         BOOLEAN      NOT NULL DEFAULT TRUE,
  role              VARCHAR(20)  NOT NULL DEFAULT 'user' CHECK (role IN ('user','admin')),
  created_at        TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

-- Refresh tokens (one row per active session)
CREATE TABLE refresh_tokens (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token_hash  TEXT        NOT NULL UNIQUE,  -- bcrypt hash of the raw token
  expires_at  TIMESTAMPTZ NOT NULL,
  user_agent  TEXT,
  ip_address  INET,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Extended profile (separated from auth for clean SRP)
CREATE TABLE profiles (
  user_id       UUID        PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  display_name  VARCHAR(60)  NOT NULL,
  avatar_url    TEXT,
  bio           VARCHAR(500),
  status_message VARCHAR(140),
  last_seen     TIMESTAMPTZ,
  -- Privacy settings
  last_seen_visibility  VARCHAR(20) NOT NULL DEFAULT 'contacts'
                         CHECK (last_seen_visibility IN ('everyone','contacts','nobody')),
  avatar_visibility     VARCHAR(20) NOT NULL DEFAULT 'everyone'
                         CHECK (avatar_visibility IN ('everyone','contacts','nobody')),
  add_me_policy         VARCHAR(20) NOT NULL DEFAULT 'everyone'
                         CHECK (add_me_policy IN ('everyone','contacts','nobody')),
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_users_email     ON users(email);
CREATE INDEX idx_users_username  ON users(username);
CREATE INDEX idx_refresh_tokens_user_id ON refresh_tokens(user_id);
CREATE INDEX idx_refresh_tokens_expires ON refresh_tokens(expires_at);

-- Trigger: auto-update updated_at on users
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

CREATE TRIGGER users_updated_at
  BEFORE UPDATE ON users
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER profiles_updated_at
  BEFORE UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();
