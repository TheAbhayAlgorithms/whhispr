/**
 * db/migrate.ts
 * Simple sequential migration runner.
 * Reads SQL files from db/migrations/ in numeric order and applies
 * any that haven't been run yet (tracked in the schema_migrations table).
 *
 * Usage: npm run migrate
 */
import fs from 'fs';
import path from 'path';
import pool, { withTransaction } from '../config/database';
import { logger } from '../utils/logger';

const MIGRATIONS_DIR = path.join(__dirname, 'migrations');

async function ensureMigrationsTable(): Promise<void> {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      id         SERIAL PRIMARY KEY,
      filename   VARCHAR(255) UNIQUE NOT NULL,
      applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);
}

async function getAppliedMigrations(): Promise<Set<string>> {
  const result = await pool.query<{ filename: string }>(
    'SELECT filename FROM schema_migrations ORDER BY id',
  );
  return new Set(result.rows.map((r) => r.filename));
}

async function runMigrations(): Promise<void> {
  await ensureMigrationsTable();
  const applied = await getAppliedMigrations();

  const files = fs
    .readdirSync(MIGRATIONS_DIR)
    .filter((f) => f.endsWith('.sql'))
    .sort(); // lexicographic order — files are prefixed with 001_, 002_, …

  let ran = 0;
  for (const file of files) {
    if (applied.has(file)) {
      logger.info(`[migrate] Skipping (already applied): ${file}`);
      continue;
    }

    const sql = fs.readFileSync(path.join(MIGRATIONS_DIR, file), 'utf-8');

    await withTransaction(async (client) => {
      await client.query(sql);
      await client.query('INSERT INTO schema_migrations (filename) VALUES ($1)', [file]);
    });

    logger.info(`[migrate] Applied: ${file}`);
    ran++;
  }

  if (ran === 0) {
    logger.info('[migrate] Nothing new to apply — database is up to date.');
  } else {
    logger.info(`[migrate] Done — applied ${ran} migration(s).`);
  }
}

runMigrations()
  .catch((err: Error) => {
    logger.error('[migrate] Failed', { message: err.message, stack: err.stack });
    process.exit(1);
  })
  .finally(() => {
    void pool.end();
  });
