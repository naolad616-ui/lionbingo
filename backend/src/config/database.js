import { DatabaseSync } from 'node:sqlite';
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const dbPath = process.env.DATABASE_PATH
  ? path.resolve(process.cwd(), process.env.DATABASE_PATH)
  : path.resolve(__dirname, '../../data/lionbingo.db');

const dbDir = path.dirname(dbPath);

if (!fs.existsSync(dbDir)) {
  fs.mkdirSync(dbDir, { recursive: true });
}

const db = new DatabaseSync(dbPath);

db.exec('PRAGMA journal_mode = WAL');
db.exec('PRAGMA foreign_keys = ON');

export function initializeDatabase() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS settings (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      key TEXT NOT NULL UNIQUE,
      value TEXT,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now'))
    )
  `);

  db.exec(`
    CREATE TABLE IF NOT EXISTS cartelas (
      card_id INTEGER PRIMARY KEY,
      grid TEXT NOT NULL,
      updated_at TEXT DEFAULT (datetime('now'))
    )
  `);

  db.exec(`
    CREATE TABLE IF NOT EXISTS winner_results (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      room_id TEXT NOT NULL,
      cartela_number INTEGER NOT NULL,
      total_pool REAL NOT NULL,
      winner_payout REAL NOT NULL,
      house_profit REAL NOT NULL,
      commission_rate REAL NOT NULL,
      commission_tier_id TEXT,
      commission_tier_label TEXT,
      cards_sold INTEGER NOT NULL DEFAULT 0,
      matched_pattern TEXT,
      created_at TEXT DEFAULT (datetime('now'))
    )
  `);

  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY CHECK (id = 1),
      name TEXT NOT NULL,
      username TEXT NOT NULL UNIQUE,
      password_hash TEXT NOT NULL,
      avatar_path TEXT,
      password_set_by_user INTEGER NOT NULL DEFAULT 0,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now'))
    )
  `);

  try {
    db.exec(`
      ALTER TABLE users
      ADD COLUMN password_set_by_user INTEGER NOT NULL DEFAULT 0
    `);
  } catch {
    // Column already exists.
  }

  db.exec(`
    CREATE TABLE IF NOT EXISTS auth_sessions (
      token TEXT PRIMARY KEY,
      user_id INTEGER NOT NULL,
      expires_at TEXT NOT NULL,
      created_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (user_id) REFERENCES users(id)
    )
  `);

  db.exec(`
    CREATE TABLE IF NOT EXISTS game_sales_history (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      session_id TEXT NOT NULL UNIQUE,
      room_id TEXT NOT NULL DEFAULT 'default',
      game_started_at TEXT NOT NULL,
      game_ended_at TEXT NOT NULL,
      final_winning_number INTEGER,
      cards_sold INTEGER NOT NULL DEFAULT 0,
      bet_amount REAL NOT NULL DEFAULT 0,
      total_collected REAL NOT NULL DEFAULT 0,
      commission REAL NOT NULL DEFAULT 0,
      winner_payout REAL NOT NULL DEFAULT 0,
      cartela_number INTEGER,
      matched_pattern TEXT,
      called_count INTEGER NOT NULL DEFAULT 0,
      completion_reason TEXT NOT NULL DEFAULT 'reset',
      operator_name TEXT,
      created_at TEXT DEFAULT (datetime('now'))
    )
  `);

  db.exec(`
    CREATE INDEX IF NOT EXISTS idx_game_sales_history_ended_at
    ON game_sales_history (game_ended_at)
  `);

  db.exec(`
    CREATE TABLE IF NOT EXISTS admin_users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      username TEXT NOT NULL UNIQUE,
      password_hash TEXT NOT NULL,
      role TEXT NOT NULL CHECK (role IN ('super_admin', 'manager', 'admin')),
      permissions TEXT NOT NULL DEFAULT '[]',
      is_active INTEGER NOT NULL DEFAULT 1,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now'))
    )
  `);

  db.exec(`
    CREATE TABLE IF NOT EXISTS admin_sessions (
      token TEXT PRIMARY KEY,
      admin_id INTEGER NOT NULL,
      expires_at TEXT NOT NULL,
      created_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (admin_id) REFERENCES admin_users(id) ON DELETE CASCADE
    )
  `);

  db.exec(`
    CREATE TABLE IF NOT EXISTS admin_login_history (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      admin_id INTEGER,
      username TEXT NOT NULL,
      action TEXT NOT NULL,
      ip_address TEXT,
      user_agent TEXT,
      success INTEGER NOT NULL DEFAULT 1,
      details TEXT,
      created_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (admin_id) REFERENCES admin_users(id) ON DELETE SET NULL
    )
  `);

  db.exec(`
    CREATE INDEX IF NOT EXISTS idx_admin_login_history_created_at
    ON admin_login_history (created_at)
  `);
}

initializeDatabase();

export default db;
