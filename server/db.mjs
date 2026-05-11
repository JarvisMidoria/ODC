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

  CREATE TABLE IF NOT EXISTS professional_email_verifications (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    token_hash TEXT NOT NULL UNIQUE,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    sent_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    expires_at TEXT NOT NULL,
    used_at TEXT,
    FOREIGN KEY (user_id) REFERENCES professional_users(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS contact_messages (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    email TEXT NOT NULL,
    phone TEXT,
    subject TEXT NOT NULL,
    sector TEXT NOT NULL DEFAULT '',
    message TEXT NOT NULL,
    source TEXT NOT NULL DEFAULT 'contact-page',
    status TEXT NOT NULL DEFAULT 'unread',
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS product_status_overrides (
    product_id TEXT PRIMARY KEY,
    status TEXT NOT NULL DEFAULT 'available',
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS product_colorway_status_overrides (
    product_id TEXT NOT NULL,
    colorway_id TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'available',
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (product_id, colorway_id)
  );

  CREATE TABLE IF NOT EXISTS product_import_jobs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    url TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'queued',
    message TEXT NOT NULL DEFAULT '',
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS admin_users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'active',
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    last_login_at TEXT
  );

  CREATE TABLE IF NOT EXISTS admin_sessions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    token TEXT NOT NULL UNIQUE,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    last_seen_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    expires_at TEXT,
    FOREIGN KEY (user_id) REFERENCES admin_users(id) ON DELETE CASCADE
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

if (!hasColumn("professional_users", "email_verified_at")) {
  db.exec(`ALTER TABLE professional_users ADD COLUMN email_verified_at TEXT`);
  db.exec(`UPDATE professional_users SET email_verified_at = CURRENT_TIMESTAMP WHERE status = 'active' AND email_verified_at IS NULL`);
}

if (!hasColumn("professional_sessions", "expires_at")) {
  db.exec(`ALTER TABLE professional_sessions ADD COLUMN expires_at TEXT`);
  db.exec(`UPDATE professional_sessions SET expires_at = datetime(created_at, '+30 days') WHERE expires_at IS NULL`);
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

  CREATE INDEX IF NOT EXISTS idx_professional_sessions_token ON professional_sessions(token);
  CREATE INDEX IF NOT EXISTS idx_professional_sessions_expires_at ON professional_sessions(expires_at);
  CREATE INDEX IF NOT EXISTS idx_professional_email_verifications_token_hash ON professional_email_verifications(token_hash);
  CREATE INDEX IF NOT EXISTS idx_professional_email_verifications_user_id ON professional_email_verifications(user_id);
  CREATE INDEX IF NOT EXISTS idx_professional_email_verifications_expires_at ON professional_email_verifications(expires_at);
  CREATE INDEX IF NOT EXISTS idx_professional_favorites_user_id ON professional_favorites(user_id);
  CREATE INDEX IF NOT EXISTS idx_admin_sessions_token ON admin_sessions(token);
  CREATE INDEX IF NOT EXISTS idx_admin_sessions_expires_at ON admin_sessions(expires_at);
`);

export { db, DB_PATH };
