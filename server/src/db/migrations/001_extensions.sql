-- ============================================================
-- Migration 001: Enable extensions
-- ============================================================
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";   -- uuid_generate_v4()
CREATE EXTENSION IF NOT EXISTS "pgcrypto";    -- gen_random_uuid(), crypt()
CREATE EXTENSION IF NOT EXISTS "pg_trgm";     -- trigram index for full-text search
CREATE EXTENSION IF NOT EXISTS "citext";      -- case-insensitive text type
