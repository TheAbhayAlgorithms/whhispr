/**
 * db/seed.ts
 * Development seed data — creates demo users, contacts, and a group chat.
 * Run: npm run seed
 *
 * WARNING: This wipes and re-seeds. NEVER run against production.
 */
import pool, { withTransaction } from '../config/database';
import { logger } from '../utils/logger';

async function seed(): Promise<void> {
  if (process.env.NODE_ENV === 'production') {
    throw new Error('Refusing to seed in production');
  }

  logger.info('[seed] Resetting database tables...');

  await withTransaction(async (client) => {
    // Clean existing seed data (in dependency order)
    await client.query(`
      TRUNCATE notifications, push_subscriptions, reactions, message_deletes,
               message_status, attachments, messages, chat_members, chats,
               reports, blocks, contacts, refresh_tokens, profiles, users
      RESTART IDENTITY CASCADE
    `);

    logger.info('[seed] Database truncated — all tables are now clean with 0 users.');
  });

  logger.info('[seed] Ready for initial admin registration! Register the first user to become admin.');
}

seed()
  .catch((err: Error) => {
    logger.error('[seed] Failed', { message: err.message });
    process.exit(1);
  })
  .finally(() => {
    void pool.end();
  });
