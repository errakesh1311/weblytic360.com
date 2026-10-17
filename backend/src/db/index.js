const fs = require('fs');
const path = require('path');
const { DatabaseSync } = require('node:sqlite');
const config = require('../config');

fs.mkdirSync(path.dirname(config.DB_FILE), { recursive: true });

const db = new DatabaseSync(config.DB_FILE);
db.exec('PRAGMA journal_mode = WAL');
db.exec('PRAGMA foreign_keys = ON');

function init() {
  const sql = fs.readFileSync(path.join(__dirname, 'migrations', '001_init.sql'), 'utf8');
  db.exec(sql);
  addMissingColumns();
  console.log(`[db] ready at ${config.DB_FILE}`);
}

/**
 * `CREATE TABLE IF NOT EXISTS` never alters an existing table, so columns added
 * after a database was first created have to be patched in here.
 */
function addMissingColumns() {
  addColumns('events', {
    ai_source: 'TEXT',
    ai_vendor: 'TEXT',
    ai_kind: 'TEXT',
    utm_term: 'TEXT',
    utm_content: 'TEXT',
  });

  addColumns('users', {
    reset_token: 'TEXT',
    reset_token_expires_at: 'TEXT',
    trial_ends_at: 'TEXT',
    dark_mode: 'INTEGER NOT NULL DEFAULT 0',
    timezone: "TEXT NOT NULL DEFAULT 'UTC'",
    week_starts_on: "TEXT NOT NULL DEFAULT 'monday'",
  });

  db.exec(`CREATE INDEX IF NOT EXISTS idx_events_ai ON events(site_id, ai_kind, created_at)`);
  db.exec(`CREATE INDEX IF NOT EXISTS idx_users_reset_token ON users(reset_token)`);

  // Tables introduced after 001_init.sql.
  db.exec(`
    CREATE TABLE IF NOT EXISTS notifications (
      id         TEXT PRIMARY KEY,
      user_id    TEXT NOT NULL,
      type       TEXT NOT NULL DEFAULT 'info',
      title      TEXT NOT NULL,
      body       TEXT,
      link       TEXT,
      read_at    TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    )
  `);
  db.exec(
    `CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications(user_id, read_at)`
  );

  // Team members: people invited to an account owner's workspace.
  db.exec(`
    CREATE TABLE IF NOT EXISTS team_members (
      id         TEXT PRIMARY KEY,
      owner_id   TEXT NOT NULL,
      email      TEXT NOT NULL,
      name       TEXT,
      role       TEXT NOT NULL DEFAULT 'viewer',
      status     TEXT NOT NULL DEFAULT 'invited',
      member_id  TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (owner_id) REFERENCES users(id) ON DELETE CASCADE,
      UNIQUE (owner_id, email)
    )
  `);
  db.exec(`CREATE INDEX IF NOT EXISTS idx_team_owner ON team_members(owner_id)`);

  // API keys: tokens used to push events or query stats programmatically.
  db.exec(`
    CREATE TABLE IF NOT EXISTS api_keys (
      id          TEXT PRIMARY KEY,
      user_id     TEXT NOT NULL,
      name        TEXT NOT NULL,
      prefix      TEXT NOT NULL,
      key_hash    TEXT NOT NULL,
      scope       TEXT NOT NULL DEFAULT 'read',
      last_used_at TEXT,
      revoked_at  TEXT,
      created_at  TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    )
  `);
  db.exec(`CREATE INDEX IF NOT EXISTS idx_api_keys_user ON api_keys(user_id)`);
  db.exec(`CREATE INDEX IF NOT EXISTS idx_api_keys_hash ON api_keys(key_hash)`);

  // Import jobs: historical data uploads processed into events.
  db.exec(`
    CREATE TABLE IF NOT EXISTS import_jobs (
      id           TEXT PRIMARY KEY,
      user_id      TEXT NOT NULL,
      site_id      TEXT NOT NULL,
      source       TEXT NOT NULL DEFAULT 'csv',
      filename     TEXT,
      status       TEXT NOT NULL DEFAULT 'pending',
      total_rows   INTEGER NOT NULL DEFAULT 0,
      imported_rows INTEGER NOT NULL DEFAULT 0,
      error        TEXT,
      created_at   TEXT NOT NULL DEFAULT (datetime('now')),
      completed_at TEXT,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY (site_id) REFERENCES sites(id) ON DELETE CASCADE
    )
  `);
  db.exec(`CREATE INDEX IF NOT EXISTS idx_import_jobs_user ON import_jobs(user_id)`);
}

/** Adds any of `columns` that the table does not already have. */
function addColumns(table, columns) {
  const existing = new Set(db.prepare(`PRAGMA table_info(${table})`).all().map((c) => c.name));

  for (const [name, type] of Object.entries(columns)) {
    if (!existing.has(name)) {
      db.exec(`ALTER TABLE ${table} ADD COLUMN ${name} ${type}`);
    }
  }
}

module.exports = { db, init };