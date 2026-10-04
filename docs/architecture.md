# Whispr Platform — Architecture & ERD Specification

## 1. System Overview

Whispr is an enterprise-grade, high-concurrency real-time communication platform designed for low-latency messaging, robust presence tracking, and rich media sharing.

### Tech Stack

- **Frontend**: React 18, TypeScript, Tailwind CSS, Zustand, Vite
- **Backend**: Node.js, Express, TypeScript, Socket.IO
- **Database**: PostgreSQL 16 (relational schema, transactional integrity, GIN trigram full-text search)
- **Cache & Pub/Sub**: Redis 7 (ephemeral presence tracking, socket cluster adapter, rate limiting)
- **Object Storage**: S3-compatible (MinIO / AWS S3) with local disk fallback in development
- **Auth**: JWT (short-lived access tokens + rotating refresh tokens with bcrypt hash), bcrypt password hashing

---

## 2. Entity Relationship Diagram (ERD)

```mermaid
erDiagram
    users ||--|| profiles : "has"
    users ||--o{ refresh_tokens : "owns"
    users ||--o{ contacts : "requests / receives"
    users ||--o{ blocks : "blocks / is blocked"
    users ||--o{ reports : "reports / is reported"
    users ||--o{ chat_members : "participates in"
    users ||--o{ messages : "sends"
    users ||--o{ message_status : "delivery state"
    users ||--o{ reactions : "reacts"
    users ||--o{ notifications : "receives"
    users ||--o{ push_subscriptions : "subscribes"

    chats ||--|{ chat_members : "contains"
    chats ||--o{ messages : "contains"

    messages ||--o{ attachments : "has"
    messages ||--o{ reactions : "receives"
    messages ||--o{ message_status : "tracked by"
    messages ||--o{ message_deletes : "deleted per user"
    messages ||--o{ messages : "replies to / forwarded from"

    users {
        uuid id PK
        citext username UK
        citext email UK
        text password_hash
        boolean is_email_verified
        boolean is_active
        varchar role
        timestamptz created_at
        timestamptz updated_at
    }

    profiles {
        uuid user_id PK,FK
        varchar display_name
        text avatar_url
        varchar bio
        varchar status_message
        timestamptz last_seen
        varchar last_seen_visibility
        varchar avatar_visibility
        varchar add_me_policy
        timestamptz updated_at
    }

    chats {
        uuid id PK
        varchar type "direct | group"
        varchar name
        text avatar_url
        varchar description
        uuid created_by FK
        timestamptz created_at
        timestamptz updated_at
    }

    chat_members {
        uuid id PK
        uuid chat_id FK
        uuid user_id FK
        varchar role "admin | member"
        timestamptz joined_at
        timestamptz left_at
        boolean is_muted
        timestamptz mute_until
    }

    messages {
        uuid id PK
        uuid chat_id FK
        uuid sender_id FK
        varchar type "text | image | video | audio | document | system"
        text content
        uuid reply_to_id FK
        uuid forwarded_from FK
        boolean is_edited
        boolean is_deleted
        timestamptz created_at
    }

    message_status {
        uuid id PK
        uuid message_id FK
        uuid user_id FK
        varchar status "sent | delivered | read"
        timestamptz updated_at
    }

    attachments {
        uuid id PK
        uuid message_id FK
        text file_name
        bigint file_size
        varchar mime_type
        text storage_key
        text thumbnail_key
        integer width
        integer height
        integer duration
    }

    reactions {
        uuid id PK
        uuid message_id FK
        uuid user_id FK
        varchar emoji
        timestamptz created_at
    }
```

---

## 3. Database Indexing & Optimization Strategy

1. **Primary Key Clustering**: All tables use UUIDv4 (`gen_random_uuid()`) for decentralized generation.
2. **Chat Timeline Queries**: `messages(chat_id, created_at DESC) WHERE is_deleted = FALSE` enables instantaneous reverse-chronological pagination.
3. **Membership Index**: Partial index `chat_members(user_id) WHERE left_at IS NULL` allows sub-millisecond retrieval of all active dialogs for a user.
4. **Full-Text Search (FTS)**: GIN index over `to_tsvector('english', COALESCE(content, ''))` on `messages` enables scalable keyword search across millions of messages.
5. **Presence & Heartbeats**: Stored in Redis with `SETEX presence:<user_id> 30 "online"` to offload high-frequency transient writes from PostgreSQL.
