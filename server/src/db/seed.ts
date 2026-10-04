/**
 * db/seed.ts
 * Development seed data — creates demo users, contacts, and a group chat.
 * Run: npm run seed
 *
 * WARNING: This wipes and re-seeds. NEVER run against production.
 */
import bcrypt from 'bcryptjs';
import { v4 as uuidv4 } from 'uuid';
import pool, { withTransaction } from '../config/database';
import { logger } from '../utils/logger';

const SALT_ROUNDS = 10;

interface SeedUser {
  id: string;
  username: string;
  email: string;
  displayName: string;
  bio: string;
}

const SEED_USERS: SeedUser[] = [
  {
    id: uuidv4(),
    username: 'alice',
    email: 'alice@whispr.chat',
    displayName: 'Alice Chen',
    bio: 'Product designer 🎨',
  },
  {
    id: uuidv4(),
    username: 'bob',
    email: 'bob@whispr.chat',
    displayName: 'Bob Martinez',
    bio: 'Full-stack engineer 🛠️',
  },
  {
    id: uuidv4(),
    username: 'carol',
    email: 'carol@whispr.chat',
    displayName: 'Carol Kim',
    bio: 'DevOps enthusiast ☁️',
  },
];

const DEFAULT_PASSWORD = 'Password123!';

async function seed(): Promise<void> {
  if (process.env.NODE_ENV === 'production') {
    throw new Error('Refusing to seed in production');
  }

  logger.info('[seed] Starting...');

  const passwordHash = await bcrypt.hash(DEFAULT_PASSWORD, SALT_ROUNDS);

  await withTransaction(async (client) => {
    // Clean existing seed data (in dependency order)
    await client.query(`
      TRUNCATE notifications, push_subscriptions, reactions, message_deletes,
               message_status, attachments, messages, chat_members, chats,
               reports, blocks, contacts, refresh_tokens, profiles, users
      RESTART IDENTITY CASCADE
    `);

    // ── Insert users & profiles ────────────────────────────────────────
    for (const u of SEED_USERS) {
      await client.query(
        `INSERT INTO users (id, username, email, password_hash, is_email_verified)
         VALUES ($1, $2, $3, $4, TRUE)`,
        [u.id, u.username, u.email, passwordHash],
      );

      await client.query(
        `INSERT INTO profiles (user_id, display_name, bio, last_seen)
         VALUES ($1, $2, $3, NOW())`,
        [u.id, u.displayName, u.bio],
      );
    }

    const [alice, bob, carol] = SEED_USERS;

    // ── Contacts: alice ↔ bob (accepted) ──────────────────────────────
    await client.query(
      `INSERT INTO contacts (requester_id, addressee_id, status)
       VALUES ($1, $2, 'accepted')`,
      [alice.id, bob.id],
    );

    // ── Contact: carol → alice (pending) ──────────────────────────────
    await client.query(
      `INSERT INTO contacts (requester_id, addressee_id, status)
       VALUES ($1, $2, 'pending')`,
      [carol.id, alice.id],
    );

    // ── DM chat: alice ↔ bob ──────────────────────────────────────────
    const dmId = uuidv4();
    await client.query(`INSERT INTO chats (id, type, created_by) VALUES ($1, 'direct', $2)`, [
      dmId,
      alice.id,
    ]);
    await client.query(
      `INSERT INTO chat_members (chat_id, user_id, role)
       VALUES ($1, $2, 'member'), ($1, $3, 'member')`,
      [dmId, alice.id, bob.id],
    );

    // Seed messages in the DM
    const msg1 = uuidv4();
    await client.query(
      `INSERT INTO messages (id, chat_id, sender_id, content)
       VALUES ($1, $2, $3, 'Hey Bob! Welcome to Whispr 👋')`,
      [msg1, dmId, alice.id],
    );
    const msg2 = uuidv4();
    await client.query(
      `INSERT INTO messages (id, chat_id, sender_id, content)
       VALUES ($1, $2, $3, 'Thanks Alice! Looks great 🚀')`,
      [msg2, dmId, bob.id],
    );

    // ── Group chat: the whole team ─────────────────────────────────────
    const groupId = uuidv4();
    await client.query(
      `INSERT INTO chats (id, type, name, description, created_by)
       VALUES ($1, 'group', 'Whispr Dev Team', 'Building the future of chat', $2)`,
      [groupId, alice.id],
    );
    await client.query(
      `INSERT INTO chat_members (chat_id, user_id, role)
       VALUES ($1, $2, 'admin'), ($1, $3, 'member'), ($1, $4, 'member')`,
      [groupId, alice.id, bob.id, carol.id],
    );

    const sysMsg = uuidv4();
    await client.query(
      `INSERT INTO messages (id, chat_id, sender_id, type, content)
       VALUES ($1, $2, NULL, 'system', 'Group created by Alice')`,
      [sysMsg, groupId],
    );
  });

  logger.info('[seed] Done ✅');
  logger.info(`[seed] Default password for all users: ${DEFAULT_PASSWORD}`);
  logger.info(`[seed] Users: ${SEED_USERS.map((u) => u.email).join(', ')}`);
}

seed()
  .catch((err: Error) => {
    logger.error('[seed] Failed', { message: err.message });
    process.exit(1);
  })
  .finally(() => {
    void pool.end();
  });
