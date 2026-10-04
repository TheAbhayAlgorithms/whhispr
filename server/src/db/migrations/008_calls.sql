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
