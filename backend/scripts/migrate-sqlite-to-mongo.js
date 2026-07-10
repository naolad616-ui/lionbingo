/**
 * Migrate legacy SQLite data (lionbingo.db) into MongoDB Atlas.
 *
 * Usage:
 *   node scripts/migrate-sqlite-to-mongo.js
 *
 * Requires:
 *   MONGODB_URI
 *   DATABASE_PATH (optional, defaults to backend/data/lionbingo.db)
 *
 * Does NOT delete the SQLite file.
 */
import dns from 'node:dns';
import 'dotenv/config';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { DatabaseSync } from 'node:sqlite';
import mongoose from 'mongoose';
import { connectDatabase, getMongoUri } from '../src/config/database.js';
import {
  AdminLoginHistory,
  AdminSession,
  AdminUser,
  AuthSession,
  Cartela,
  ensureSequenceAtLeast,
  GameSalesHistory,
  Setting,
  User,
  WinnerResult,
} from '../src/models/index.js';

dns.setServers(['8.8.8.8', '1.1.1.1']);

const __dirname = path.dirname(fileURLToPath(import.meta.url));

function resolveSqlitePath() {
  if (process.env.DATABASE_PATH) {
    return path.resolve(process.cwd(), process.env.DATABASE_PATH);
  }
  return path.resolve(__dirname, '../data/lionbingo.db');
}

function tableExists(db, tableName) {
  const row = db.prepare(
    `SELECT name FROM sqlite_master WHERE type = 'table' AND name = ?`,
  ).get(tableName);
  return Boolean(row);
}

function parseJsonMaybe(value, fallback) {
  if (value == null) return fallback;
  if (typeof value === 'object') return value;
  try {
    return JSON.parse(value);
  } catch {
    return fallback;
  }
}

async function migrateUsers(db) {
  if (!tableExists(db, 'users')) return 0;
  const rows = db.prepare('SELECT * FROM users').all();
  let count = 0;

  for (const row of rows) {
    await User.findOneAndUpdate(
      { id: row.id },
      {
        $set: {
          id: row.id,
          name: row.name,
          username: row.username,
          password_hash: row.password_hash,
          avatar_path: row.avatar_path ?? null,
          password_set_by_user: Number(row.password_set_by_user ?? 0),
          created_at: row.created_at || new Date().toISOString(),
          updated_at: row.updated_at || new Date().toISOString(),
        },
      },
      { upsert: true },
    );
    count += 1;
  }

  return count;
}

async function migrateAuthSessions(db) {
  if (!tableExists(db, 'auth_sessions')) return 0;
  const rows = db.prepare('SELECT * FROM auth_sessions').all();
  let count = 0;

  for (const row of rows) {
    await AuthSession.findOneAndUpdate(
      { token: row.token },
      {
        $set: {
          token: row.token,
          user_id: row.user_id,
          expires_at: row.expires_at,
          created_at: row.created_at || new Date().toISOString(),
        },
      },
      { upsert: true },
    );
    count += 1;
  }

  return count;
}

async function migrateAdminUsers(db) {
  if (!tableExists(db, 'admin_users')) return 0;
  const rows = db.prepare('SELECT * FROM admin_users').all();
  let maxId = 0;
  let count = 0;

  for (const row of rows) {
    maxId = Math.max(maxId, Number(row.id) || 0);
    await AdminUser.findOneAndUpdate(
      { id: row.id },
      {
        $set: {
          id: row.id,
          name: row.name,
          username: row.username,
          password_hash: row.password_hash,
          role: row.role,
          permissions: parseJsonMaybe(row.permissions, []),
          is_active: Number(row.is_active ?? 1),
          created_at: row.created_at || new Date().toISOString(),
          updated_at: row.updated_at || new Date().toISOString(),
        },
      },
      { upsert: true },
    );
    count += 1;
  }

  if (maxId > 0) {
    await ensureSequenceAtLeast('admin_users', maxId);
  }

  return count;
}

async function migrateAdminSessions(db) {
  if (!tableExists(db, 'admin_sessions')) return 0;
  const rows = db.prepare('SELECT * FROM admin_sessions').all();
  let count = 0;

  for (const row of rows) {
    await AdminSession.findOneAndUpdate(
      { token: row.token },
      {
        $set: {
          token: row.token,
          admin_id: row.admin_id,
          expires_at: row.expires_at,
          created_at: row.created_at || new Date().toISOString(),
        },
      },
      { upsert: true },
    );
    count += 1;
  }

  return count;
}

async function migrateAdminLoginHistory(db) {
  if (!tableExists(db, 'admin_login_history')) return 0;
  const rows = db.prepare('SELECT * FROM admin_login_history').all();
  let maxId = 0;
  let count = 0;

  for (const row of rows) {
    maxId = Math.max(maxId, Number(row.id) || 0);
    await AdminLoginHistory.findOneAndUpdate(
      { id: row.id },
      {
        $set: {
          id: row.id,
          admin_id: row.admin_id ?? null,
          username: row.username,
          action: row.action,
          ip_address: row.ip_address ?? null,
          user_agent: row.user_agent ?? null,
          success: Number(row.success ?? 1),
          details: row.details ?? null,
          created_at: row.created_at || new Date().toISOString(),
        },
      },
      { upsert: true },
    );
    count += 1;
  }

  if (maxId > 0) {
    await ensureSequenceAtLeast('admin_login_history', maxId);
  }

  return count;
}

async function migrateCartelas(db) {
  if (!tableExists(db, 'cartelas')) return 0;
  const rows = db.prepare('SELECT * FROM cartelas').all();
  let count = 0;

  for (const row of rows) {
    await Cartela.findOneAndUpdate(
      { card_id: row.card_id },
      {
        $set: {
          card_id: row.card_id,
          grid: parseJsonMaybe(row.grid, []),
          updated_at: row.updated_at || new Date().toISOString(),
        },
      },
      { upsert: true },
    );
    count += 1;
  }

  return count;
}

async function migrateSettings(db) {
  if (!tableExists(db, 'settings')) return 0;
  const rows = db.prepare('SELECT * FROM settings').all();
  let count = 0;

  for (const row of rows) {
    await Setting.findOneAndUpdate(
      { key: row.key },
      {
        $set: {
          key: row.key,
          value: parseJsonMaybe(row.value, row.value),
          created_at: row.created_at || new Date().toISOString(),
          updated_at: row.updated_at || new Date().toISOString(),
        },
      },
      { upsert: true },
    );
    count += 1;
  }

  return count;
}

async function migrateGameSalesHistory(db) {
  if (!tableExists(db, 'game_sales_history')) return 0;
  const rows = db.prepare('SELECT * FROM game_sales_history').all();
  let maxId = 0;
  let count = 0;

  for (const row of rows) {
    maxId = Math.max(maxId, Number(row.id) || 0);
    await GameSalesHistory.findOneAndUpdate(
      { session_id: row.session_id },
      {
        $set: {
          id: row.id,
          session_id: row.session_id,
          room_id: row.room_id || 'default',
          game_started_at: row.game_started_at,
          game_ended_at: row.game_ended_at,
          final_winning_number: row.final_winning_number ?? null,
          cards_sold: Number(row.cards_sold ?? 0),
          bet_amount: Number(row.bet_amount ?? 0),
          total_collected: Number(row.total_collected ?? 0),
          commission: Number(row.commission ?? 0),
          winner_payout: Number(row.winner_payout ?? 0),
          cartela_number: row.cartela_number ?? null,
          matched_pattern: row.matched_pattern ?? null,
          called_count: Number(row.called_count ?? 0),
          completion_reason: row.completion_reason || 'reset',
          operator_name: row.operator_name ?? null,
          created_at: row.created_at || new Date().toISOString(),
        },
      },
      { upsert: true },
    );
    count += 1;
  }

  if (maxId > 0) {
    await ensureSequenceAtLeast('game_sales_history', maxId);
  }

  return count;
}

async function migrateWinnerResults(db) {
  if (!tableExists(db, 'winner_results')) return 0;
  const rows = db.prepare('SELECT * FROM winner_results').all();
  let maxId = 0;
  let count = 0;

  for (const row of rows) {
    maxId = Math.max(maxId, Number(row.id) || 0);
    await WinnerResult.findOneAndUpdate(
      { id: row.id },
      {
        $set: {
          id: row.id,
          room_id: row.room_id,
          cartela_number: row.cartela_number,
          total_pool: row.total_pool,
          winner_payout: row.winner_payout,
          house_profit: row.house_profit,
          commission_rate: row.commission_rate,
          commission_tier_id: row.commission_tier_id ?? null,
          commission_tier_label: row.commission_tier_label ?? null,
          cards_sold: Number(row.cards_sold ?? 0),
          matched_pattern: row.matched_pattern ?? null,
          created_at: row.created_at || new Date().toISOString(),
        },
      },
      { upsert: true },
    );
    count += 1;
  }

  if (maxId > 0) {
    await ensureSequenceAtLeast('winner_results', maxId);
  }

  return count;
}

async function main() {
  const sqlitePath = resolveSqlitePath();
  console.log('[migrate] SQLite source:', sqlitePath);
  console.log('[migrate] MongoDB target:', getMongoUri().replace(/\/\/([^:]+):([^@]+)@/, '//$1:***@'));

  if (!fs.existsSync(sqlitePath)) {
    throw new Error(`SQLite file not found at ${sqlitePath}`);
  }

  await connectDatabase();
  const db = new DatabaseSync(sqlitePath, { readOnly: true });

  const summary = {
    users: await migrateUsers(db),
    auth_sessions: await migrateAuthSessions(db),
    admin_users: await migrateAdminUsers(db),
    admin_sessions: await migrateAdminSessions(db),
    admin_login_history: await migrateAdminLoginHistory(db),
    cartelas: await migrateCartelas(db),
    settings: await migrateSettings(db),
    game_sales_history: await migrateGameSalesHistory(db),
    winner_results: await migrateWinnerResults(db),
  };

  console.log('[migrate] Completed successfully:');
  console.log(JSON.stringify(summary, null, 2));
  console.log('[migrate] SQLite file was NOT deleted:', sqlitePath);

  db.close();
  await mongoose.disconnect();
}

main().catch(async (error) => {
  console.error('[migrate] Failed:', error);
  try {
    await mongoose.disconnect();
  } catch {
    // ignore
  }
  process.exit(1);
});
