/**
 * config/database.ts
 * PostgreSQL connection pool — single shared instance across the app.
 */
import { Pool, PoolClient, QueryResultRow } from 'pg';
import { env } from './env';

const pool = new Pool({
  connectionString: env.DATABASE_URL,
  max: 20, // maximum pool size
  idleTimeoutMillis: 30_000,
  connectionTimeoutMillis: 5_000,
  ssl: env.isProduction ? { rejectUnauthorized: false } : false,
});

// Surface pool-level errors (e.g. DB going away) without crashing
pool.on('error', (err) => {
  console.error('[DB] Unexpected pool error:', err.message);
});

/**
 * Run a single parameterised query.
 * Usage: query('SELECT * FROM users WHERE id = $1', [userId])
 */
export async function query<T extends QueryResultRow = QueryResultRow>(
  text: string,
  params?: unknown[],
): Promise<{ rows: T[]; rowCount: number | null }> {
  const start = Date.now();
  const result = await pool.query<T>(text, params);
  const duration = Date.now() - start;

  if (env.isDevelopment) {
    // Log slow queries (> 200 ms) in development
    if (duration > 200) {
      console.warn(`[DB] Slow query (${duration}ms): ${text.substring(0, 120)}`);
    }
  }

  return result;
}

/**
 * Acquire a client for multi-statement transactions.
 * Always call client.release() in a finally block.
 */
export async function getClient(): Promise<PoolClient> {
  return pool.connect();
}

/**
 * Run a callback inside a transaction; automatically commits or rolls back.
 */
export async function withTransaction<T>(callback: (client: PoolClient) => Promise<T>): Promise<T> {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const result = await callback(client);
    await client.query('COMMIT');
    return result;
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

/** Verify the DB is reachable — used by the health-check endpoint. */
export async function checkDatabaseHealth(): Promise<boolean> {
  try {
    const result = await query<{ one: number | string }>('SELECT 1 AS one');
    return Number(result.rows[0]?.one) === 1;
  } catch {
    return false;
  }
}

export default pool;
