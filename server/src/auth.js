const crypto = require('node:crypto');
const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const rateLimit = require('express-rate-limit');
const db = require('./db');
const mailer = require('./mailer');
const { postWebhook } = require('./webhook');

const JWT_SECRET = process.env.JWT_SECRET;
const OTP_TTL_MIN = 10;
const OTP_MAX_ATTEMPTS = 5;
const OTP_RESEND_COOLDOWN_S = 60;
// Compared against when the email is unknown, so response time doesn't reveal which emails exist.
const DUMMY_HASH = bcrypt.hashSync('not-a-real-password', 10);

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const PHONE_RE = /^\+?[0-9][0-9\s-]{6,17}$/;

class HttpError extends Error {
  constructor(status, message, code) {
    super(message);
    this.status = status;
    this.code = code;
  }
}

const str = (v) => (typeof v === 'string' ? v.trim() : '');
const normEmail = (v) => str(v).toLowerCase();
const publicUser = (u) => ({ id: u.id, name: u.name, email: u.email, phone: u.phone });
const signToken = (u) => jwt.sign({ sub: String(u.id) }, JWT_SECRET, { expiresIn: '30d' });
const hashOtp = (email, code) => crypto.createHmac('sha256', JWT_SECRET).update(`${email}:${code}`).digest('hex');
const findUser = (email) => db.prepare('SELECT * FROM users WHERE email = ?').get(email);

/** Creates and emails a fresh code. Returns seconds left on the cooldown if one was sent too recently. */
async function issueOtp(user) {
  const now = Date.now();
  const existing = db.prepare('SELECT last_sent_at FROM otps WHERE email = ?').get(user.email);
  if (existing) {
    const wait = OTP_RESEND_COOLDOWN_S - Math.floor((now - existing.last_sent_at) / 1000);
    if (wait > 0) return wait;
  }
  const code = String(crypto.randomInt(0, 1_000_000)).padStart(6, '0');
  db.prepare(
    `INSERT INTO otps (email, code_hash, expires_at, attempts, last_sent_at) VALUES (?, ?, ?, 0, ?)
     ON CONFLICT(email) DO UPDATE SET code_hash = excluded.code_hash, expires_at = excluded.expires_at,
       attempts = 0, last_sent_at = excluded.last_sent_at`
  ).run(user.email, hashOtp(user.email, code), now + OTP_TTL_MIN * 60_000, now);
  await mailer.sendOtp(user, code, OTP_TTL_MIN);
  return 0;
}

function requireAuth(req, _res, next) {
  const header = req.get('authorization') || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : '';
  let payload;
  try {
    payload = jwt.verify(token, JWT_SECRET);
  } catch {
    throw new HttpError(401, 'Please sign in again.', 'UNAUTHENTICATED');
  }
  const user = db.prepare('SELECT * FROM users WHERE id = ? AND verified = 1').get(Number(payload.sub));
  if (!user) throw new HttpError(401, 'Please sign in again.', 'UNAUTHENTICATED');
  req.user = user;
  next();
}

/** Resolves the user when the email and password match, otherwise null. */
async function checkCredentials(email, password) {
  const user = findUser(normEmail(email));
  const ok = await bcrypt.compare(typeof password === 'string' ? password : '', user ? user.password_hash : DUMMY_HASH);
  return user && ok ? user : null;
}

/** Permanently removes the account and everything tied to it. The stores require this to be self-service. */
async function deleteAccount(user) {
  const refs = db.prepare('SELECT ref FROM tickets WHERE user_id = ?').all(user.id).map((t) => t.ref);
  db.exec('BEGIN');
  try {
    db.prepare('DELETE FROM tickets WHERE user_id = ?').run(user.id);
    db.prepare('DELETE FROM otps WHERE email = ?').run(user.email);
    db.prepare('DELETE FROM users WHERE id = ?').run(user.id);
    db.exec('COMMIT');
  } catch (e) {
    db.exec('ROLLBACK');
    throw e;
  }
  // The account is gone at this point; a mail or webhook failure must not undo that.
  const [mail, hook] = await Promise.allSettled([
    mailer.sendAccountDeleted(user),
    // Lets a mirrored CRM purge its copy too.
    postWebhook({ event: 'account.deleted', requester: { email: user.email }, ticketRefs: refs }),
  ]);
  if (mail.status === 'rejected') console.error(`[account ${user.id}] deletion email failed:`, mail.reason?.message);
  if (hook.status === 'rejected') console.error(`[account ${user.id}] deletion webhook failed:`, hook.reason?.message);
}

const limiter = rateLimit({
  windowMs: 15 * 60_000,
  limit: 40,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many attempts. Please try again in a few minutes.', code: 'RATE_LIMITED' },
});

const router = express.Router();
router.use(limiter);

router.post('/register', async (req, res) => {
  const name = str(req.body.name);
  const email = normEmail(req.body.email);
  const phone = str(req.body.phone);
  const password = typeof req.body.password === 'string' ? req.body.password : '';

  if (name.length < 2 || name.length > 80) throw new HttpError(400, 'Please enter your full name.');
  if (!EMAIL_RE.test(email) || email.length > 254) throw new HttpError(400, 'Please enter a valid email address.');
  if (!PHONE_RE.test(phone)) throw new HttpError(400, 'Please enter a valid phone number.');
  if (password.length < 8 || password.length > 72) throw new HttpError(400, 'Password must be 8–72 characters.');

  const passwordHash = await bcrypt.hash(password, 10);
  const existing = findUser(email);
  if (existing?.verified) {
    throw new HttpError(409, 'An account with this email already exists. Please log in.', 'EMAIL_TAKEN');
  }
  if (existing) {
    // Unverified sign-up being retried: take the latest details.
    db.prepare('UPDATE users SET name = ?, phone = ?, password_hash = ? WHERE id = ?').run(name, phone, passwordHash, existing.id);
  } else {
    db.prepare('INSERT INTO users (name, email, phone, password_hash, created_at) VALUES (?, ?, ?, ?, ?)').run(
      name, email, phone, passwordHash, new Date().toISOString()
    );
  }
  await issueOtp({ name, email });
  res.status(201).json({ email, message: 'We sent a 6-digit code to your email.' });
});

router.post('/verify-otp', (req, res) => {
  const email = normEmail(req.body.email);
  const code = str(req.body.code);
  const invalid = new HttpError(400, 'That code is incorrect or has expired.', 'OTP_INVALID');

  const user = findUser(email);
  const otp = db.prepare('SELECT * FROM otps WHERE email = ?').get(email);
  if (!user || !otp || !/^\d{6}$/.test(code)) throw invalid;
  if (otp.expires_at < Date.now()) throw invalid;
  if (otp.attempts >= OTP_MAX_ATTEMPTS) {
    throw new HttpError(429, 'Too many incorrect attempts. Please request a new code.', 'OTP_LOCKED');
  }

  const expected = Buffer.from(otp.code_hash, 'hex');
  const given = Buffer.from(hashOtp(email, code), 'hex');
  if (!crypto.timingSafeEqual(expected, given)) {
    db.prepare('UPDATE otps SET attempts = attempts + 1 WHERE email = ?').run(email);
    throw invalid;
  }

  db.prepare('DELETE FROM otps WHERE email = ?').run(email);
  db.prepare('UPDATE users SET verified = 1 WHERE id = ?').run(user.id);
  res.json({ token: signToken(user), user: publicUser(user) });
});

router.post('/resend-otp', async (req, res) => {
  const user = findUser(normEmail(req.body.email));
  // Same reply whether or not the account exists.
  if (user && !user.verified) {
    const wait = await issueOtp(user);
    if (wait > 0) throw new HttpError(429, `Please wait ${wait}s before requesting another code.`, 'OTP_COOLDOWN');
  }
  res.json({ message: 'If that account needs verifying, a new code is on its way.' });
});

router.post('/login', async (req, res) => {
  const user = await checkCredentials(req.body.email, req.body.password);
  if (!user) throw new HttpError(401, 'Incorrect email or password.', 'BAD_CREDENTIALS');
  if (!user.verified) {
    await issueOtp(user);
    throw new HttpError(403, 'Please verify your email to continue. We sent you a code.', 'EMAIL_NOT_VERIFIED');
  }
  res.json({ token: signToken(user), user: publicUser(user) });
});

router.get('/me', requireAuth, (req, res) => {
  res.json({ user: publicUser(req.user) });
});

router.post('/delete-account', requireAuth, async (req, res) => {
  // 403 rather than 401: the session is fine, so the app must not sign the user out over a mistyped password.
  if (!(await checkCredentials(req.user.email, req.body.password))) {
    throw new HttpError(403, 'That password is incorrect.', 'BAD_PASSWORD');
  }
  await deleteAccount(req.user);
  res.json({ deleted: true });
});

module.exports = { router, requireAuth, HttpError, checkCredentials, deleteAccount, limiter };
