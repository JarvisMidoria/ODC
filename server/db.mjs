import { mkdirSync } from "node:fs";
import { dirname, resolve } from "node:path";
import Database from "better-sqlite3";

const DB_PATH = resolve(process.env.ODC_DB_PATH || resolve(process.cwd(), "data", "odc.sqlite"));

mkdirSync(dirname(DB_PATH), { recursive: true });

const db = new Database(DB_PATH);
db.pragma("journal_mode = WAL");
db.pragma("foreign_keys = ON");

db.exec(`
  CREATE TABLE IF NOT EXISTS professional_users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    first_name TEXT NOT NULL,
    last_name TEXT NOT NULL,
    phone TEXT NOT NULL,
    email TEXT NOT NULL UNIQUE,
    profession TEXT NOT NULL,
    password_hash TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS professional_sessions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    token TEXT NOT NULL UNIQUE,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    last_seen_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES professional_users(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS sample_requests (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    product_id TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, product_id),
    FOREIGN KEY (user_id) REFERENCES professional_users(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS sample_orders (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    phone_snapshot TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending',
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    submitted_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES professional_users(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS sample_order_items (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    order_id INTEGER NOT NULL,
    product_id TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(order_id, product_id),
    FOREIGN KEY (order_id) REFERENCES sample_orders(id) ON DELETE CASCADE
  );
`);

function hasColumn(tableName, columnName) {
  const columns = db.prepare(`PRAGMA table_info(${tableName})`).all();
  return columns.some((column) => column.name === columnName);
}

if (!hasColumn("professional_users", "status")) {
  db.exec(`ALTER TABLE professional_users ADD COLUMN status TEXT NOT NULL DEFAULT 'active'`);
}

if (!hasColumn("professional_users", "role")) {
  db.exec(`ALTER TABLE professional_users ADD COLUMN role TEXT NOT NULL DEFAULT 'professional'`);
}

if (!hasColumn("professional_users", "sample_limit")) {
  db.exec(`ALTER TABLE professional_users ADD COLUMN sample_limit INTEGER`);
}

if (!hasColumn("professional_sessions", "expires_at")) {
  db.exec(`ALTER TABLE professional_sessions ADD COLUMN expires_at TEXT`);
  db.exec(`UPDATE professional_sessions SET expires_at = datetime(created_at, '+30 days') WHERE expires_at IS NULL`);
}

if (!hasColumn("sample_orders", "admin_notes")) {
  db.exec(`ALTER TABLE sample_orders ADD COLUMN admin_notes TEXT NOT NULL DEFAULT ''`);
}

db.exec(`
  CREATE TABLE IF NOT EXISTS professional_favorites (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    product_id TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, product_id),
    FOREIGN KEY (user_id) REFERENCES professional_users(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS professional_sample_cart (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    product_id TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, product_id),
    FOREIGN KEY (user_id) REFERENCES professional_users(id) ON DELETE CASCADE
  );

  CREATE INDEX IF NOT EXISTS idx_professional_sessions_token ON professional_sessions(token);
  CREATE INDEX IF NOT EXISTS idx_professional_sessions_expires_at ON professional_sessions(expires_at);
  CREATE INDEX IF NOT EXISTS idx_professional_favorites_user_id ON professional_favorites(user_id);
  CREATE INDEX IF NOT EXISTS idx_professional_sample_cart_user_id ON professional_sample_cart(user_id);
`);

export { db, DB_PATH };
