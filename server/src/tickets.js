const crypto = require('node:crypto');
const express = require('express');
const db = require('./db');
const mailer = require('./mailer');
const { requireAuth, HttpError } = require('./auth');
const { PARK_TYPES, TIMELINES, CONTACT_METHODS, CURRENCIES } = require('./catalog');

const str = (v) => (typeof v === 'string' ? v.trim() : '');

function toTicket(row) {
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
    createdAt: row.created_at,
  };
}

function newRef() {
  const day = new Date().toISOString().slice(0, 10).replace(/-/g, '');
  return `E7-${day}-${crypto.randomBytes(3).toString('hex').toUpperCase()}`;
}

/** Optionally mirrors the ticket into another internal system (CRM, sheet, etc.). */
async function pushToWebhook(ticket, user) {
  const url = process.env.INTERNAL_WEBHOOK_URL;
  if (!url) return false;
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      ...(process.env.INTERNAL_WEBHOOK_TOKEN ? { authorization: `Bearer ${process.env.INTERNAL_WEBHOOK_TOKEN}` } : {}),
    },
    body: JSON.stringify({ event: 'ticket.created', ticket, requester: { name: user.name, email: user.email, phone: user.phone } }),
    signal: AbortSignal.timeout(10_000),
  });
  if (!res.ok) throw new Error(`webhook responded ${res.status}`);
  return true;
}

const router = express.Router();
router.use(requireAuth);

router.get('/', (req, res) => {
  const rows = db.prepare('SELECT * FROM tickets WHERE user_id = ? ORDER BY id DESC').all(req.user.id);
  res.json({ tickets: rows.map(toTicket) });
});

router.post('/', async (req, res) => {
  const b = req.body;
  const parkTypes = Array.isArray(b.parkTypes) ? [...new Set(b.parkTypes)] : [];
  const budget = Number(b.budget);
  const currency = str(b.currency);
  const location = str(b.location);
  const siteArea = str(b.siteArea) || null;
  const timeline = str(b.timeline);
  const contactMethod = str(b.contactMethod);
  const notes = str(b.notes) || null;
  const expectedVisitors = b.expectedVisitors === null || b.expectedVisitors === undefined || b.expectedVisitors === '' ? null : Number(b.expectedVisitors);

  if (parkTypes.length !== 1 || !Object.hasOwn(PARK_TYPES, parkTypes[0])) throw new HttpError(400, 'Please choose one park type.');
  if (!Number.isFinite(budget) || budget <= 0 || budget > 1e13) throw new HttpError(400, 'Please enter a valid budget.');
  if (!CURRENCIES.includes(currency)) throw new HttpError(400, 'Please choose a currency.');
  if (location.length < 2 || location.length > 120) throw new HttpError(400, 'Please tell us where the park will be.');
  if (siteArea && siteArea.length > 60) throw new HttpError(400, 'Site area is too long.');
  if (expectedVisitors !== null && (!Number.isInteger(expectedVisitors) || expectedVisitors < 1 || expectedVisitors > 1e7)) {
    throw new HttpError(400, 'Expected daily visitors must be a whole number.');
  }
  if (!Object.hasOwn(TIMELINES, timeline)) throw new HttpError(400, 'Please choose a timeline.');
  if (!Object.hasOwn(CONTACT_METHODS, contactMethod)) throw new HttpError(400, 'Please choose how we should contact you.');
  if (parkTypes.includes('other') && !notes) throw new HttpError(400, 'Please describe the park you have in mind under additional information.');
  if (notes && notes.length > 2000) throw new HttpError(400, 'Additional information must be under 2000 characters.');

  const { lastInsertRowid } = db
    .prepare(
      `INSERT INTO tickets (ref, user_id, park_types, budget, currency, location, site_area, expected_visitors,
         timeline, contact_method, notes, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    )
    .run(newRef(), req.user.id, JSON.stringify(parkTypes), budget, currency, location, siteArea, expectedVisitors,
      timeline, contactMethod, notes, new Date().toISOString());
  const id = Number(lastInsertRowid);
  const ticket = toTicket(db.prepare('SELECT * FROM tickets WHERE id = ?').get(id));

  // The ticket is saved at this point; a mail or webhook failure must not lose it.
  const [mail, hook] = await Promise.allSettled([mailer.sendTicketConfirmation(req.user, ticket), pushToWebhook(ticket, req.user)]);
  if (mail.status === 'rejected') console.error(`[${ticket.ref}] confirmation email failed:`, mail.reason?.message);
  if (hook.status === 'rejected') console.error(`[${ticket.ref}] webhook failed:`, hook.reason?.message);
  const emailSent = mail.status === 'fulfilled' && mail.value === true;
  const webhookSynced = hook.status === 'fulfilled' && hook.value === true;
  db.prepare('UPDATE tickets SET email_sent = ?, webhook_synced = ? WHERE id = ?').run(emailSent ? 1 : 0, webhookSynced ? 1 : 0, id);

  res.status(201).json({ ticket, emailSent });
});

module.exports = { router };
