-- ============================================================
-- Migration 001: Enable extensions
-- ============================================================
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";   -- uuid_generate_v4()
CREATE EXTENSION IF NOT EXISTS "pgcrypto";    -- gen_random_uuid(), crypt()
CREATE EXTENSION IF NOT EXISTS "pg_trgm";     -- trigram index for full-text search
CREATE EXTENSION IF NOT EXISTS "citext";      -- case-insensitive text type
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
-- ============================================================
-- Migration 003: Contacts & Blocks
-- ============================================================

-- Contact / friend relationship (directional request → accepted state)
CREATE TABLE contacts (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  requester_id UUID       NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  addressee_id UUID       NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  status      VARCHAR(20) NOT NULL DEFAULT 'pending'
               CHECK (status IN ('pending','accepted','rejected')),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (requester_id, addressee_id),
  CHECK (requester_id <> addressee_id)
);

-- Block list (one row per block; asymmetric)
CREATE TABLE blocks (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  blocker_id  UUID        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  blocked_id  UUID        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (blocker_id, blocked_id),
  CHECK (blocker_id <> blocked_id)
);

-- Reports
CREATE TABLE reports (
  id            UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  reporter_id   UUID        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  reported_user_id UUID     REFERENCES users(id) ON DELETE SET NULL,
  reason        VARCHAR(100) NOT NULL,
  description   TEXT,
  status        VARCHAR(20) NOT NULL DEFAULT 'open'
                 CHECK (status IN ('open','reviewed','dismissed')),
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_contacts_requester  ON contacts(requester_id);
CREATE INDEX idx_contacts_addressee  ON contacts(addressee_id);
CREATE INDEX idx_contacts_status     ON contacts(status);
CREATE INDEX idx_blocks_blocker      ON blocks(blocker_id);
CREATE INDEX idx_blocks_blocked      ON blocks(blocked_id);

CREATE TRIGGER contacts_updated_at
  BEFORE UPDATE ON contacts
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();
-- ============================================================
-- Migration 004: Chats, Members & Messages
-- ============================================================

-- A chat can be a 1-1 DM or a named group
CREATE TABLE chats (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  type        VARCHAR(10) NOT NULL CHECK (type IN ('direct','group')),
  name        VARCHAR(100),             -- NULL for direct chats
  avatar_url  TEXT,                     -- group avatar
  description VARCHAR(500),
  created_by  UUID        REFERENCES users(id) ON DELETE SET NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Members within a chat (1-1 has exactly 2 rows; groups have N)
CREATE TABLE chat_members (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  chat_id     UUID        NOT NULL REFERENCES chats(id) ON DELETE CASCADE,
  user_id     UUID        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role        VARCHAR(20) NOT NULL DEFAULT 'member'
               CHECK (role IN ('admin','member')),
  joined_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  left_at     TIMESTAMPTZ,              -- NULL = still a member
  is_muted    BOOLEAN     NOT NULL DEFAULT FALSE,
  mute_until  TIMESTAMPTZ,
  UNIQUE (chat_id, user_id)
);

-- Messages (text + media metadata in one table, attachment detail in attachments)
CREATE TABLE messages (
  id            UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  chat_id       UUID        NOT NULL REFERENCES chats(id) ON DELETE CASCADE,
  sender_id     UUID        REFERENCES users(id) ON DELETE SET NULL,
  type          VARCHAR(20) NOT NULL DEFAULT 'text'
                 CHECK (type IN ('text','image','video','audio','document','system')),
  content       TEXT,                   -- text body or system message template
  reply_to_id   UUID        REFERENCES messages(id) ON DELETE SET NULL,
  forwarded_from UUID       REFERENCES messages(id) ON DELETE SET NULL,
  is_edited     BOOLEAN     NOT NULL DEFAULT FALSE,
  edited_at     TIMESTAMPTZ,
  is_deleted    BOOLEAN     NOT NULL DEFAULT FALSE, -- "deleted for everyone"
  deleted_at    TIMESTAMPTZ,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Per-recipient delivery & read status (for DMs: 1 row; for groups: N-1 rows)
CREATE TABLE message_status (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id  UUID        NOT NULL REFERENCES messages(id) ON DELETE CASCADE,
  user_id     UUID        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  status      VARCHAR(20) NOT NULL DEFAULT 'sent'
               CHECK (status IN ('sent','delivered','read')),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (message_id, user_id)
);

-- Messages deleted only for a specific user ("delete for me")
CREATE TABLE message_deletes (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id  UUID        NOT NULL REFERENCES messages(id) ON DELETE CASCADE,
  user_id     UUID        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  deleted_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (message_id, user_id)
);

-- Emoji reactions on messages
CREATE TABLE reactions (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id  UUID        NOT NULL REFERENCES messages(id) ON DELETE CASCADE,
  user_id     UUID        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  emoji       VARCHAR(10) NOT NULL,  -- Unicode emoji character(s)
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (message_id, user_id, emoji)
);

-- File / media attachments linked to a message
CREATE TABLE attachments (
  id            UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id    UUID        NOT NULL REFERENCES messages(id) ON DELETE CASCADE,
  file_name     TEXT        NOT NULL,
  file_size     BIGINT      NOT NULL,   -- bytes
  mime_type     VARCHAR(100) NOT NULL,
  storage_key   TEXT        NOT NULL,   -- S3 key or local file path
  thumbnail_key TEXT,                   -- for images/videos
  width         INTEGER,               -- images/videos
  height        INTEGER,
  duration      INTEGER,               -- audio/video in seconds
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── Indexes (critical for query performance) ────────────────────────────────

-- Chat lookups
CREATE INDEX idx_chats_type         ON chats(type);
CREATE INDEX idx_chats_created_by   ON chats(created_by);

-- Member lookups (most-used: "which chats is user X in?")
CREATE INDEX idx_chat_members_user  ON chat_members(user_id) WHERE left_at IS NULL;
CREATE INDEX idx_chat_members_chat  ON chat_members(chat_id);

-- Message timeline (primary read path: paginated cursor)
CREATE INDEX idx_messages_chat_time ON messages(chat_id, created_at DESC) WHERE is_deleted = FALSE;
CREATE INDEX idx_messages_sender    ON messages(sender_id);
CREATE INDEX idx_messages_reply_to  ON messages(reply_to_id);

-- Full-text search on message content
CREATE INDEX idx_messages_fts ON messages USING GIN (to_tsvector('english', COALESCE(content, '')));

-- Status lookup
CREATE INDEX idx_message_status_msg ON message_status(message_id);
CREATE INDEX idx_message_status_user ON message_status(user_id);

-- Reactions
CREATE INDEX idx_reactions_message  ON reactions(message_id);

-- Attachments
CREATE INDEX idx_attachments_message ON attachments(message_id);

-- ── Auto-update triggers ────────────────────────────────────────────────────
CREATE TRIGGER chats_updated_at
  BEFORE UPDATE ON chats
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER messages_updated_at
  BEFORE UPDATE ON messages
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER message_status_updated_at
  BEFORE UPDATE ON message_status
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();
-- ============================================================
-- Migration 005: Notifications
-- ============================================================

CREATE TABLE notifications (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  type        VARCHAR(50) NOT NULL,   -- e.g. 'new_message','contact_request','mention'
  title       VARCHAR(200),
  body        TEXT,
  data        JSONB,                  -- arbitrary payload (chat_id, message_id, etc.)
  is_read     BOOLEAN     NOT NULL DEFAULT FALSE,
  read_at     TIMESTAMPTZ,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Web Push subscriptions (for offline push notifications)
CREATE TABLE push_subscriptions (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  endpoint    TEXT        NOT NULL UNIQUE,
  p256dh      TEXT        NOT NULL,
  auth        TEXT        NOT NULL,
  user_agent  TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_notifications_user ON notifications(user_id, created_at DESC);
CREATE INDEX idx_notifications_unread ON notifications(user_id) WHERE is_read = FALSE;
CREATE INDEX idx_push_subs_user ON push_subscriptions(user_id);
-- ============================================================
-- Migration 006: Channels, Public Flag & Extended Member Roles
-- ============================================================

-- 1. Support 'channel' type in chats table
ALTER TABLE chats DROP CONSTRAINT IF EXISTS chats_type_check;
ALTER TABLE chats ADD CONSTRAINT chats_type_check CHECK (type IN ('direct', 'group', 'channel'));

-- 2. Add is_public flag to chats (for public channels)
ALTER TABLE chats ADD COLUMN IF NOT EXISTS is_public BOOLEAN NOT NULL DEFAULT FALSE;

-- 3. Extend chat_members roles to include 'owner' and 'moderator'
ALTER TABLE chat_members DROP CONSTRAINT IF EXISTS chat_members_role_check;
ALTER TABLE chat_members ADD CONSTRAINT chat_members_role_check CHECK (role IN ('owner', 'admin', 'moderator', 'member'));

-- 4. Create index for public channels discovery
CREATE INDEX IF NOT EXISTS idx_chats_public ON chats(is_public) WHERE is_public = TRUE;
-- Migration 007: Add last_read_at to chat_members
ALTER TABLE chat_members ADD COLUMN IF NOT EXISTS last_read_at TIMESTAMPTZ DEFAULT NOW();
-- ============================================================
-- Migration 008: Voice & Video Calls
-- ============================================================

CREATE TABLE calls (
  id           UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  chat_id      UUID        REFERENCES chats(id) ON DELETE SET NULL,
  caller_id    UUID        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  recipient_id UUID        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  type         VARCHAR(10) NOT NULL CHECK (type IN ('audio', 'video')),
  status       VARCHAR(20) NOT NULL DEFAULT 'completed'
               CHECK (status IN ('missed', 'completed', 'rejected', 'busy', 'cancelled')),
  duration     INTEGER     NOT NULL DEFAULT 0, -- duration in seconds
  started_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  ended_at     TIMESTAMPTZ,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_calls_caller ON calls(caller_id, started_at DESC);
CREATE INDEX idx_calls_recipient ON calls(recipient_id, started_at DESC);
CREATE INDEX idx_calls_chat ON calls(chat_id, started_at DESC);
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
-- ============================================================
-- Migration 010: Scalability & Performance Indexes
-- ============================================================

-- Compound indexes for contact list and relationship filtering
CREATE INDEX IF NOT EXISTS idx_contacts_requester_status ON contacts(requester_id, status);
CREATE INDEX IF NOT EXISTS idx_contacts_addressee_status ON contacts(addressee_id, status);

-- Fast unread badge calculation across all active chats
CREATE INDEX IF NOT EXISTS idx_message_status_user_unread ON message_status(user_id, status) WHERE status <> 'read';

-- Compound partial index for timeline queries in ascending order (pagination)
CREATE INDEX IF NOT EXISTS idx_messages_chat_created_asc ON messages(chat_id, created_at ASC) WHERE is_deleted = FALSE;

-- Fast reply threads resolution
CREATE INDEX IF NOT EXISTS idx_messages_reply_not_null ON messages(reply_to_id) WHERE reply_to_id IS NOT NULL;

-- Fast fuzzy user search via GIN trigrams
CREATE INDEX IF NOT EXISTS idx_users_username_trgm ON users USING GIN (username gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_profiles_display_name_trgm ON profiles USING GIN (display_name gin_trgm_ops);

-- Notification center sorting and unread filtering
CREATE INDEX IF NOT EXISTS idx_notifications_user_read_created ON notifications(user_id, is_read, created_at DESC);
