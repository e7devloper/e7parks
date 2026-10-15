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

  -- Staff accounts for the internal web app. token_version is bumped on password reset or disable,
  -- which invalidates every token issued before it.
  CREATE TABLE IF NOT EXISTS staff (
    id            INTEGER PRIMARY KEY AUTOINCREMENT,
    name          TEXT NOT NULL,
    email         TEXT NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,
    role          TEXT NOT NULL DEFAULT 'staff',
    active        INTEGER NOT NULL DEFAULT 1,
    token_version INTEGER NOT NULL DEFAULT 0,
    created_at    TEXT NOT NULL,
    last_login_at TEXT
  );

  -- Who changed a ticket's status, and when. staff_name is kept so history survives a renamed account.
  CREATE TABLE IF NOT EXISTS ticket_events (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    ticket_id   INTEGER NOT NULL REFERENCES tickets(id) ON DELETE CASCADE,
    staff_id    INTEGER REFERENCES staff(id),
    staff_name  TEXT NOT NULL,
    from_status TEXT,
    to_status   TEXT NOT NULL,
    created_at  TEXT NOT NULL
  );
  CREATE INDEX IF NOT EXISTS ticket_events_ticket ON ticket_events(ticket_id);
`);

/** Sets a ticket's status and records who did it. No-op (and no event) when the status is unchanged. */
db.setTicketStatus = (ticketId, status, actor) => {
  const row = db.prepare('SELECT status FROM tickets WHERE id = ?').get(ticketId);
  if (!row || row.status === status) return;
  db.exec('BEGIN');
  try {
    db.prepare('UPDATE tickets SET status = ? WHERE id = ?').run(status, ticketId);
    db.prepare(
      'INSERT INTO ticket_events (ticket_id, staff_id, staff_name, from_status, to_status, created_at) VALUES (?, ?, ?, ?, ?, ?)'
    ).run(ticketId, actor.id ?? null, actor.name, row.status, status, new Date().toISOString());
    db.exec('COMMIT');
  } catch (err) {
    db.exec('ROLLBACK');
    throw err;
  }
};

module.exports = db;
