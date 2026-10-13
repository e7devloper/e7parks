const path = require('node:path');
const fs = require('node:fs');
const { DatabaseSync } = require('node:sqlite');

const file = process.env.DATABASE_FILE || path.join(__dirname, '..', 'data', 'e7parks.db');
if (file !== ':memory:') fs.mkdirSync(path.dirname(file), { recursive: true });

const db = new DatabaseSync(file);
db.exec(`
  PRAGMA journal_mode = WAL;
  PRAGMA foreign_keys = ON;

  CREATE TABLE IF NOT EXISTS users (
    id            INTEGER PRIMARY KEY AUTOINCREMENT,
    name          TEXT NOT NULL,
    email         TEXT NOT NULL UNIQUE,
    phone         TEXT NOT NULL,
    password_hash TEXT NOT NULL,
    verified      INTEGER NOT NULL DEFAULT 0,
    created_at    TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS otps (
    email        TEXT PRIMARY KEY,
    code_hash    TEXT NOT NULL,
    expires_at   INTEGER NOT NULL,
    attempts     INTEGER NOT NULL DEFAULT 0,
    last_sent_at INTEGER NOT NULL
  );

  CREATE TABLE IF NOT EXISTS tickets (
    id                INTEGER PRIMARY KEY AUTOINCREMENT,
    ref               TEXT NOT NULL UNIQUE,
    user_id           INTEGER NOT NULL REFERENCES users(id),
    park_types        TEXT NOT NULL,
    budget            REAL NOT NULL,
    currency          TEXT NOT NULL,
    location          TEXT NOT NULL,
    site_area         TEXT,
    expected_visitors INTEGER,
    timeline          TEXT NOT NULL,
    contact_method    TEXT NOT NULL,
    notes             TEXT,
    status            TEXT NOT NULL DEFAULT 'open',
    email_sent        INTEGER NOT NULL DEFAULT 0,
    webhook_synced    INTEGER NOT NULL DEFAULT 0,
    created_at        TEXT NOT NULL
  );
  CREATE INDEX IF NOT EXISTS tickets_user ON tickets(user_id);
`);

module.exports = db;
