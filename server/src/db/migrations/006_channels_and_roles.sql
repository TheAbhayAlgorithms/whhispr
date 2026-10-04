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
