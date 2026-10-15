// JSON API for the staff web app (a separate project, e7-internal). Everything except POST /login needs a staff
// token. Staff sign in with their own account; the server's ADMIN_USER / ADMIN_PASSWORD is a built-in admin login
// that exists to create the first accounts.
const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const db = require('./db');
const { HttpError, limiter } = require('./auth');
const { checkAdmin } = require('./internal');
const { PARK_TYPES, TIMELINES, CONTACT_METHODS, CURRENCIES, STATUSES } = require('./catalog');

const JWT_SECRET = process.env.JWT_SECRET;
// Keeps staff tokens and client tokens from being accepted in each other's place.
const AUDIENCE = 'staff';
const WEEK_MS = 7 * 24 * 60 * 60_000;
const ROLES = { admin: 'Admin', staff: 'Staff' };
const BUILTIN = { id: null, name: 'Built-in admin', email: null, role: 'admin', builtin: true };
// Compared against when the email is unknown, so response time doesn't reveal which accounts exist.
const DUMMY_HASH = bcrypt.hashSync('not-a-real-password', 10);
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

const str = (v) => (typeof v === 'string' ? v.trim() : '');

const sign = (sub, v) => jwt.sign({ sub, v }, JWT_SECRET, { audience: AUDIENCE, expiresIn: '12h' });
const signStaff = (s) => sign(String(s.id), s.token_version);

const publicStaff = (s) => ({
  id: s.id,
  name: s.name,
  email: s.email,
  role: s.role,
  active: Boolean(s.active),
  createdAt: s.created_at,
  lastLoginAt: s.last_login_at,
});
const me = (s) => (s.builtin ? BUILTIN : { ...publicStaff(s), builtin: false });

function requireStaff(req, _res, next) {
  const header = req.get('authorization') || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : '';
  let payload;
  try {
    payload = jwt.verify(token, JWT_SECRET, { audience: AUDIENCE });
  } catch {
    throw new HttpError(401, 'Please sign in again.', 'UNAUTHENTICATED');
  }
  if (payload.sub === 'builtin') {
    if (!process.env.ADMIN_PASSWORD) throw new HttpError(401, 'Please sign in again.', 'UNAUTHENTICATED');
    req.staff = { ...BUILTIN };
    return next();
  }
  const s = db.prepare('SELECT * FROM staff WHERE id = ?').get(Number(payload.sub));
  // Disabled accounts and tokens issued before a password reset stop working immediately.
  if (!s || !s.active || s.token_version !== payload.v) throw new HttpError(401, 'Please sign in again.', 'UNAUTHENTICATED');
  req.staff = s;
  next();
}

function requireAdmin(req, _res, next) {
  if (req.staff.role !== 'admin') throw new HttpError(403, 'Only admins can manage the team.', 'FORBIDDEN');
  next();
}

function validPassword(v) {
  if (typeof v !== 'string' || v.length < 10 || v.length > 72) throw new HttpError(400, 'Password must be 10–72 characters.');
  return v;
}

const TICKET_SELECT = `SELECT t.*, u.name AS user_name, u.email AS user_email, u.phone AS user_phone,
    e.staff_name AS last_by, e.created_at AS last_at
  FROM tickets t JOIN users u ON u.id = t.user_id
  LEFT JOIN ticket_events e ON e.id = (SELECT MAX(id) FROM ticket_events WHERE ticket_id = t.id)`;

function toStaffTicket(row) {
  return {
    id: row.id,
    ref: row.ref,
    parkTypes: JSON.parse(row.park_types),
    budget: row.budget,
    currency: row.currency,
    location: row.location,
    siteArea: row.site_area,
    expectedVisitors: row.expected_visitors,
    timeline: row.timeline,
    contactMethod: row.contact_method,
    notes: row.notes,
    status: row.status,
    emailSent: Boolean(row.email_sent),
    createdAt: row.created_at,
    // When the status last changed and who changed it; null until a staff member first changes it.
    statusChangedAt: row.last_at ?? null,
    statusChangedBy: row.last_by ?? null,
    requester: { id: row.user_id, name: row.user_name, email: row.user_email, phone: row.user_phone },
  };
}

function findTicket(id) {
  const row = db.prepare(`${TICKET_SELECT} WHERE t.id = ?`).get(Number(id));
  if (!row) throw new HttpError(404, 'Ticket not found.', 'NOT_FOUND');
  return row;
}

const history = (ticketId) =>
  db
    .prepare('SELECT * FROM ticket_events WHERE ticket_id = ? ORDER BY id DESC')
    .all(ticketId)
    .map((e) => ({ by: e.staff_name, staffId: e.staff_id, from: e.from_status, to: e.to_status, at: e.created_at }));

/** Zero-filled counts for every key in a catalog, so the web app can chart them without gaps. */
const countBy = (catalog, rows, pick) => {
  const out = Object.fromEntries(Object.keys(catalog).map((k) => [k, 0]));
  for (const r of rows) for (const k of [pick(r)].flat()) out[k] = (out[k] || 0) + 1;
  return out;
};

const findStaff = (id) => {
  const s = db.prepare('SELECT * FROM staff WHERE id = ?').get(Number(id));
  if (!s) throw new HttpError(404, 'Staff member not found.', 'NOT_FOUND');
  return s;
};

const router = express.Router();

router.post('/login', limiter, (req, res) => {
  // `username` is accepted for older clients; the built-in admin signs in with ADMIN_USER in the email field.
  const login = str(req.body.email ?? req.body.username);
  const password = typeof req.body.password === 'string' ? req.body.password : '';
  const s = db.prepare('SELECT * FROM staff WHERE email = ?').get(login.toLowerCase());
  const passOk = bcrypt.compareSync(password, s?.password_hash ?? DUMMY_HASH);
  if (s && passOk) {
    if (!s.active) throw new HttpError(403, 'This account has been disabled. Ask an admin to turn it back on.', 'DISABLED');
    db.prepare('UPDATE staff SET last_login_at = ? WHERE id = ?').run(new Date().toISOString(), s.id);
    return res.json({ token: signStaff(s), staff: me(s) });
  }
  if (checkAdmin(login, password)) return res.json({ token: sign('builtin'), staff: BUILTIN });
  throw new HttpError(401, 'Incorrect email or password.', 'BAD_CREDENTIALS');
});

router.use(requireStaff);

router.get('/me', (req, res) => res.json({ staff: me(req.staff) }));

// Returns a fresh token, since changing the password ends every other session.
router.post('/me/password', (req, res) => {
  if (req.staff.builtin) throw new HttpError(400, "The built-in admin's password is set on the server.");
  if (!bcrypt.compareSync(String(req.body.currentPassword ?? ''), req.staff.password_hash)) {
    throw new HttpError(400, 'Your current password is incorrect.', 'BAD_CREDENTIALS');
  }
  const hash = bcrypt.hashSync(validPassword(req.body.newPassword), 10);
  db.prepare('UPDATE staff SET password_hash = ?, token_version = token_version + 1 WHERE id = ?').run(hash, req.staff.id);
  res.json({ token: signStaff(findStaff(req.staff.id)) });
});

// Keys and display labels, so the web app doesn't have to keep its own copy.
router.get('/catalog', (_req, res) => {
  res.json({ parkTypes: PARK_TYPES, timelines: TIMELINES, contactMethods: CONTACT_METHODS, currencies: CURRENCIES, statuses: STATUSES, roles: ROLES });
});

router.get('/tickets', (req, res) => {
  const { status } = req.query;
  if (status !== undefined && !Object.hasOwn(STATUSES, status)) throw new HttpError(400, 'Unknown status.');
  const rows = db
    .prepare(`${TICKET_SELECT} ${status ? 'WHERE t.status = ?' : ''} ORDER BY t.id DESC`)
    .all(...(status ? [status] : []));
  res.json({ tickets: rows.map(toStaffTicket) });
});

router.get('/tickets/:id', (req, res) => {
  const row = findTicket(req.params.id);
  res.json({ ticket: { ...toStaffTicket(row), history: history(row.id) } });
});

// The client sees the new status in the mobile app the next time their requests load.
router.patch('/tickets/:id', (req, res) => {
  const { status } = req.body;
  if (!Object.hasOwn(STATUSES, status)) throw new HttpError(400, 'Unknown status.');
  const { id } = findTicket(req.params.id);
  db.setTicketStatus(id, status, req.staff);
  res.json({ ticket: { ...toStaffTicket(findTicket(id)), history: history(id) } });
});

router.get('/kpis', (_req, res) => {
  const rows = db.prepare('SELECT * FROM tickets ORDER BY id').all();
  const now = Date.now();
  const age = (r) => now - Date.parse(r.created_at);

  // Budgets are never summed across currencies.
  const byCurrency = CURRENCIES.map((currency) => {
    const mine = rows.filter((r) => r.currency === currency);
    return { currency, count: mine.length, totalBudget: mine.reduce((sum, r) => sum + r.budget, 0) };
  });

  // Last 12 weeks, oldest first; the final entry is the 7 days ending now.
  const perWeek = Array.from({ length: 12 }, (_, i) => {
    const end = now - (11 - i) * WEEK_MS;
    const count = rows.filter((r) => Date.parse(r.created_at) > end - WEEK_MS && Date.parse(r.created_at) <= end).length;
    return { weekEnding: new Date(end).toISOString(), count };
  });

  res.json({
    generatedAt: new Date(now).toISOString(),
    totalTickets: rows.length,
    ticketsLast7Days: rows.filter((r) => age(r) <= WEEK_MS).length,
    ticketsLast30Days: rows.filter((r) => age(r) <= 30 * 24 * 60 * 60_000).length,
    openOlderThan7Days: rows.filter((r) => r.status === 'open' && age(r) > WEEK_MS).length,
    verifiedClients: db.prepare('SELECT COUNT(*) AS n FROM users WHERE verified = 1').get().n,
    byStatus: countBy(STATUSES, rows, (r) => r.status),
    byParkType: countBy(PARK_TYPES, rows, (r) => JSON.parse(r.park_types)),
    byTimeline: countBy(TIMELINES, rows, (r) => r.timeline),
    byContactMethod: countBy(CONTACT_METHODS, rows, (r) => r.contact_method),
    byCurrency,
    perWeek,
  });
});

// Team management (admins only).
router.get('/team', requireAdmin, (_req, res) => {
  res.json({ staff: db.prepare('SELECT * FROM staff ORDER BY active DESC, name COLLATE NOCASE').all().map(publicStaff) });
});

router.post('/team', requireAdmin, (req, res) => {
  const name = str(req.body.name);
  const email = str(req.body.email).toLowerCase();
  const role = req.body.role ?? 'staff';
  if (name.length < 2 || name.length > 80) throw new HttpError(400, 'Please enter their full name.');
  if (!EMAIL_RE.test(email) || email.length > 254) throw new HttpError(400, 'Please enter a valid email address.');
  if (!Object.hasOwn(ROLES, role)) throw new HttpError(400, 'Unknown role.');
  const hash = bcrypt.hashSync(validPassword(req.body.password), 10);
  if (db.prepare('SELECT 1 FROM staff WHERE email = ?').get(email)) {
    throw new HttpError(409, 'Someone on the team already uses this email.', 'EMAIL_TAKEN');
  }
  const { lastInsertRowid } = db
    .prepare('INSERT INTO staff (name, email, password_hash, role, created_at) VALUES (?, ?, ?, ?, ?)')
    .run(name, email, hash, role, new Date().toISOString());
  res.status(201).json({ staff: publicStaff(findStaff(lastInsertRowid)) });
});

// Any of: name, role, active, password. Resetting the password or disabling signs the person out everywhere.
router.patch('/team/:id', requireAdmin, (req, res) => {
  const s = findStaff(req.params.id);
  const self = s.id === req.staff.id;
  const next = { name: s.name, role: s.role, active: s.active, password_hash: s.password_hash };
  let revoke = false;

  if (req.body.name !== undefined) {
    next.name = str(req.body.name);
    if (next.name.length < 2 || next.name.length > 80) throw new HttpError(400, 'Please enter their full name.');
  }
  if (req.body.role !== undefined) {
    if (!Object.hasOwn(ROLES, req.body.role)) throw new HttpError(400, 'Unknown role.');
    if (self && req.body.role !== 'admin') throw new HttpError(400, "You can't remove your own admin role.");
    next.role = req.body.role;
  }
  if (req.body.active !== undefined) {
    if (self && !req.body.active) throw new HttpError(400, "You can't disable your own account.");
    next.active = req.body.active ? 1 : 0;
    revoke ||= !next.active;
  }
  if (req.body.password !== undefined) {
    next.password_hash = bcrypt.hashSync(validPassword(req.body.password), 10);
    revoke = true;
  }

  db.prepare('UPDATE staff SET name = ?, role = ?, active = ?, password_hash = ?, token_version = token_version + ? WHERE id = ?').run(
    next.name,
    next.role,
    next.active,
    next.password_hash,
    revoke ? 1 : 0,
    s.id
  );
  res.json({ staff: publicStaff(findStaff(s.id)) });
});

module.exports = { router };
