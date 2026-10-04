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
