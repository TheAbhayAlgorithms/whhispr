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
