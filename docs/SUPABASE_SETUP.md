# Storing Whispr Messages & Data on Supabase

Whispr uses PostgreSQL with raw SQL schemas. Since **Supabase is fully managed PostgreSQL**, all messages, chats, contacts, users, and notifications can be stored directly in your Supabase project without any code changes.

---

## 1. Create a Supabase Project

1. Go to [supabase.com](https://supabase.com) and sign in.
2. Click **New Project**.
3. Choose a project name (e.g. `whispr-db`), enter a secure database password, and choose your preferred region.
4. Wait ~1 minute for Supabase to provision your database.

---

## 2. Set Up the Database Schema

You can apply the tables in either of two ways:

### Option A: Using the Supabase Web SQL Editor (Easiest)
1. In your Supabase dashboard, click **SQL Editor** from the left navigation.
2. Click **New query**.
3. Open [`supabase/schema.sql`](../supabase/schema.sql) from this repository, copy all contents, and paste into the SQL editor.
4. Click **Run**.
5. All tables (`users`, `profiles`, `chats`, `messages`, `contacts`, `notifications`, etc.) will be created immediately.

### Option B: Running the Migration Script via CLI
From your terminal:
```bash
# In the server folder
cd server

# Run migrations pointing to your Supabase connection string
DATABASE_URL="postgresql://postgres.[PROJECT-REF]:[PASSWORD]@aws-0-[REGION].pooler.supabase.com:6543/postgres" npm run migrate

# (Optional) Seed demo users (alice, bob, etc.)
DATABASE_URL="postgresql://postgres.[PROJECT-REF]:[PASSWORD]@aws-0-[REGION].pooler.supabase.com:6543/postgres" npm run seed
```

---

## 3. Connect Backend to Supabase

In your backend server's `.env` (or environment variables in Railway / Render / Fly.io):

```ini
# Get this from Supabase Dashboard -> Project Settings -> Database -> Connection string (URI)
DATABASE_URL=postgresql://postgres.[PROJECT_REF]:[YOUR_PASSWORD]@aws-0-[REGION].pooler.supabase.com:6543/postgres

# Set to production for automatic SSL connection to Supabase
NODE_ENV=production
```

When `NODE_ENV=production`, Whispr automatically connects using `ssl: { rejectUnauthorized: false }`, which is required for Supabase.

---

## 4. How Data is Stored in Supabase

| Table | What is stored |
|---|---|
| `users` | Account credentials (`email`, `username`, bcrypt password hashes) |
| `profiles` | Display names, avatar URLs, bio, presence status |
| `chats` | 1-to-1 direct chats and group channels |
| `chat_members` | Chat participants, roles (admin/member), and read receipts (`last_read_at`) |
| `messages` | Chat messages with sender, chat ID, timestamps, reply parent, encryption flags |
| `message_attachments` | Image, audio, video, and file attachment metadata |
| `message_reactions` | Emoji reactions per message |
| `contacts` / `contact_requests` | Friend requests and contact lists |
| `notifications` | In-app notification records |

You can view, search, and manage all your stored messages and users in real time under **Table Editor** in the Supabase Dashboard!
