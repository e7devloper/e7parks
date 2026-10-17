// Public park-request form on e7entertainments.com. No account or login — the site just hands us
// requester details and the ticket fields, and we create (or reuse) a user row behind the scenes so
// the ticket fits the same schema and staff dashboard as requests raised in the app.
const crypto = require('node:crypto');
const express = require('express');
const bcrypt = require('bcryptjs');
const rateLimit = require('express-rate-limit');
const db = require('./db');
const { HttpError, EMAIL_RE, PHONE_RE } = require('./auth');
const { validateTicketFields, createTicket } = require('./tickets');

const str = (v) => (typeof v === 'string' ? v.trim() : '');
const normEmail = (v) => str(v).toLowerCase();

const limiter = rateLimit({
  windowMs: 60 * 60_000,
  limit: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many requests. Please try again later, or email us directly.', code: 'RATE_LIMITED' },
});

const router = express.Router();
router.use(limiter);

router.post('/', async (req, res) => {
  const name = str(req.body.name);
  const email = normEmail(req.body.email);
  const phone = str(req.body.phone);

  if (name.length < 2 || name.length > 80) throw new HttpError(400, 'Please enter your full name.');
  if (!EMAIL_RE.test(email) || email.length > 254) throw new HttpError(400, 'Please enter a valid email address.');
  if (!PHONE_RE.test(phone)) throw new HttpError(400, 'Please enter a valid phone number.');

  const fields = validateTicketFields(req.body);

  // Reuse an existing account (app or an earlier web request) as-is; never touch its name, phone or
  // verification state here — this form isn't proof of who owns the email. Only a brand-new lead gets
  // a row of its own, unverified, with a password nobody will ever use (there is no login from here).
  let user = db.prepare('SELECT * FROM users WHERE email = ?').get(email);
  if (!user) {
    const passwordHash = await bcrypt.hash(crypto.randomBytes(24).toString('hex'), 10);
    const { lastInsertRowid } = db
      .prepare('INSERT INTO users (name, email, phone, password_hash, created_at) VALUES (?, ?, ?, ?, ?)')
      .run(name, email, phone, passwordHash, new Date().toISOString());
    user = db.prepare('SELECT * FROM users WHERE id = ?').get(Number(lastInsertRowid));
  }

  const { ticket, emailSent } = await createTicket(user, fields, 'web');
  res.status(201).json({ ticket, emailSent, requester: { name: user.name, email: user.email } });
});

module.exports = { router };
