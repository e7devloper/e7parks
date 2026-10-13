// Staff-facing ticket dashboard. This is the part meant to live at internal.e7entertainments.com.
const crypto = require('node:crypto');
const express = require('express');
const db = require('./db');
const { esc } = require('./mailer');
const { PARK_TYPES, TIMELINES, CONTACT_METHODS, STATUSES } = require('./catalog');

const ADMIN_USER = process.env.ADMIN_USER || 'admin';
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD;

const safeEqual = (a, b) => {
  const [x, y] = [a, b].map((v) => crypto.createHash('sha256').update(String(v)).digest());
  return crypto.timingSafeEqual(x, y);
};

function basicAuth(req, res, next) {
  if (!ADMIN_PASSWORD) return res.status(503).type('text').send('Set ADMIN_PASSWORD in server/.env to enable the internal dashboard.');
  const [scheme, encoded] = (req.get('authorization') || '').split(' ');
  if (scheme === 'Basic' && encoded) {
    const decoded = Buffer.from(encoded, 'base64').toString();
    const i = decoded.indexOf(':');
    // Evaluate both so a wrong username takes as long as a wrong password.
    const userOk = safeEqual(decoded.slice(0, i), ADMIN_USER);
    const passOk = safeEqual(decoded.slice(i + 1), ADMIN_PASSWORD);
    if (i > -1 && userOk && passOk) return next();
  }
  res.set('WWW-Authenticate', 'Basic realm="E7 Internal", charset="UTF-8"').status(401).type('text').send('Authentication required.');
}

// Basic-auth credentials are sent automatically by the browser, so reject cross-site form posts.
function sameOrigin(req, res, next) {
  const origin = req.get('origin');
  if (origin && new URL(origin).host !== req.get('host')) return res.status(403).type('text').send('Cross-site request blocked.');
  next();
}

const router = express.Router();
router.use(basicAuth);

router.get('/', (req, res) => {
  const filter = Object.hasOwn(STATUSES, req.query.status) ? req.query.status : null;
  const rows = db
    .prepare(
      `SELECT t.*, u.name AS user_name, u.email AS user_email, u.phone AS user_phone
       FROM tickets t JOIN users u ON u.id = t.user_id
       ${filter ? 'WHERE t.status = ?' : ''} ORDER BY t.id DESC LIMIT 500`
    )
    .all(...(filter ? [filter] : []));

  const options = (current) =>
    Object.entries(STATUSES).map(([k, label]) => `<option value="${k}"${k === current ? ' selected' : ''}>${esc(label)}</option>`).join('');

  const body = rows
    .map((t) => {
      const types = JSON.parse(t.park_types).map((k) => PARK_TYPES[k] || k).join(', ');
      return `<tr>
        <td><b>${esc(t.ref)}</b><br><small>${esc(new Date(t.created_at).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' }))} IST</small></td>
        <td>${esc(t.user_name)}<br><small><a href="mailto:${esc(t.user_email)}">${esc(t.user_email)}</a><br>${esc(t.user_phone)}<br>Prefers: ${esc(CONTACT_METHODS[t.contact_method] || t.contact_method)}</small></td>
        <td>${esc(types)}</td>
        <td class="num">${esc(t.currency)} ${esc(Number(t.budget).toLocaleString('en-IN'))}</td>
        <td>${esc(t.location)}<br><small>Area: ${esc(t.site_area || '—')}<br>Visitors/day: ${esc(t.expected_visitors ?? '—')}</small></td>
        <td>${esc(TIMELINES[t.timeline] || t.timeline)}</td>
        <td class="notes">${esc(t.notes || '—')}</td>
        <td><form method="post" action="/internal/tickets/${t.id}/status">
          <select name="status" onchange="this.form.submit()">${options(t.status)}</select><noscript><button>Save</button></noscript>
        </form><small>${t.email_sent ? 'Confirmation emailed' : 'Email not sent'}</small></td>
      </tr>`;
    })
    .join('');

  const tabs = [[null, 'All'], ...Object.entries(STATUSES)]
    .map(([k, label]) => `<a class="${k === filter ? 'on' : ''}" href="/internal${k ? `?status=${k}` : ''}">${esc(label)}</a>`)
    .join('');

  res.type('html').send(`<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Park requests · E7 Internal</title>
<style>
  body{font:14px/1.45 system-ui,sans-serif;margin:0;background:#f5f6f8;color:#15171c}
  header{background:#12131a;color:#fff;padding:16px 24px}h1{font-size:18px;margin:0}
  main{padding:20px 24px}nav a{display:inline-block;margin:0 6px 14px 0;padding:6px 12px;border-radius:999px;background:#fff;color:#15171c;text-decoration:none;border:1px solid #dcdfe5}
  nav a.on{background:#12131a;color:#fff;border-color:#12131a}
  .wrap{overflow-x:auto;background:#fff;border:1px solid #dcdfe5;border-radius:10px}
  table{border-collapse:collapse;width:100%;min-width:1000px}th,td{padding:10px 12px;text-align:left;vertical-align:top;border-bottom:1px solid #eceef2}
  th{font-size:12px;text-transform:uppercase;letter-spacing:.04em;color:#666c7a;background:#fafbfc}
  small{color:#666c7a}.num{white-space:nowrap}.notes{max-width:280px;white-space:pre-wrap;overflow-wrap:anywhere}
  select{padding:5px;border-radius:6px;border:1px solid #c9cdd6;display:block;margin-bottom:4px}.empty{padding:40px;text-align:center;color:#666c7a}
</style></head><body>
<header><h1>E7 Entertainments · Park requests</h1></header>
<main><nav>${tabs}</nav>
<div class="wrap">${
    rows.length
      ? `<table><thead><tr><th>Ticket</th><th>Requester</th><th>Park type</th><th>Budget</th><th>Site</th><th>Timeline</th><th>Notes</th><th>Status</th></tr></thead><tbody>${body}</tbody></table>`
      : '<div class="empty">No requests yet.</div>'
  }</div></main></body></html>`);
});

router.post('/tickets/:id/status', sameOrigin, express.urlencoded({ extended: false }), (req, res) => {
  const status = req.body?.status;
  if (!Object.hasOwn(STATUSES, status)) return res.status(400).type('text').send('Unknown status.');
  db.prepare('UPDATE tickets SET status = ? WHERE id = ?').run(status, Number(req.params.id));
  res.redirect(303, req.get('referer') || '/internal');
});

module.exports = { router };
