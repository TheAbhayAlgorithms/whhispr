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
