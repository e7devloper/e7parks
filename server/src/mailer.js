const nodemailer = require('nodemailer');
const { PARK_TYPES, TIMELINES, CONTACT_METHODS } = require('./catalog');

const FROM = process.env.MAIL_FROM || 'E7 Entertainments <no-reply@e7entertainments.com>';

// Resend sends over HTTPS, which works on hosts that block outbound SMTP (e.g. Railway Hobby).
const RESEND_API_KEY = process.env.RESEND_API_KEY;

const resend = RESEND_API_KEY && {
  async sendMail(mail) {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: `Bearer ${RESEND_API_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(mail),
    });
    if (!res.ok) throw new Error(`Resend ${res.status}: ${await res.text()}`);
  },
};

const transport = resend || (process.env.SMTP_HOST
  ? nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: Number(process.env.SMTP_PORT || 587),
      secure: process.env.SMTP_SECURE === 'true',
      auth: process.env.SMTP_USER
        ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS }
        : undefined,
    })
  : null);

const esc = (s) =>
  String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);

// MAIL_FROM is a no-reply address with no mailbox behind it, so point people at support instead.
const SUPPORT_EMAIL = process.env.SUPPORT_EMAIL;
const footerText = SUPPORT_EMAIL
  ? `\n\nThis is an automated email, please don't reply to it. For any questions, write to ${SUPPORT_EMAIL}.`
  : '';
const footerHtml = SUPPORT_EMAIL
  ? `<p style="color:#666;font-size:13px">This is an automated email, please don't reply to it. For any questions, write to <a href="mailto:${esc(SUPPORT_EMAIL)}">${esc(SUPPORT_EMAIL)}</a>.</p>`
  : '';

async function send({ to, subject, text, html }) {
  text += footerText;
  html += footerHtml;
  if (!transport) {
    // No email provider configured: print the mail so the flow is usable in development.
    console.log(`\n--- EMAIL (email not configured, not sent) ---\nTo: ${to}\nSubject: ${subject}\n\n${text}\n---------------------------------------------\n`);
    return false;
  }
  await transport.sendMail({ from: FROM, to, subject, text, html });
  return true;
}

function sendOtp(user, code, minutes) {
  const text = `Hi ${user.name},\n\nYour E7 Parks verification code is ${code}.\nIt expires in ${minutes} minutes. If you didn't request it, you can ignore this email.\n\nE7 Entertainments`;
  const html = `<p>Hi ${esc(user.name)},</p><p>Your E7 Parks verification code is</p><p style="font-size:28px;font-weight:700;letter-spacing:6px">${esc(code)}</p><p>It expires in ${minutes} minutes. If you didn't request it, you can ignore this email.</p><p>E7 Entertainments</p>`;
  return send({ to: user.email, subject: `${code} is your E7 Parks verification code`, text, html });
}

function ticketRows(t) {
  return [
    ['Reference', t.ref],
    ['Park type', t.parkTypes.map((k) => PARK_TYPES[k] || k).join(', ')],
    ['Budget', `${t.currency} ${Number(t.budget).toLocaleString('en-IN')}`],
    ['Location', t.location],
    ['Site area', t.siteArea || '—'],
    ['Expected daily visitors', t.expectedVisitors ?? '—'],
    ['Timeline', TIMELINES[t.timeline] || t.timeline],
    ['Preferred contact', CONTACT_METHODS[t.contactMethod] || t.contactMethod],
    ['Additional information', t.notes || '—'],
  ];
}

function sendTicketConfirmation(user, ticket) {
  const rows = ticketRows(ticket);
  const text = `Hi ${user.name},\n\nThanks for your request. We've raised ticket ${ticket.ref} and our team will be in touch.\n\n${rows
    .map(([k, v]) => `${k}: ${v}`)
    .join('\n')}\n\nYour contact details: ${user.email}, ${user.phone}\n\nE7 Entertainments`;
  const html = `<p>Hi ${esc(user.name)},</p><p>Thanks for your request. We've raised ticket <b>${esc(ticket.ref)}</b> and our team will be in touch.</p><table cellpadding="6" style="border-collapse:collapse">${rows
    .map(([k, v]) => `<tr><td style="color:#666;vertical-align:top">${esc(k)}</td><td>${esc(v)}</td></tr>`)
    .join('')}</table><p>Your contact details: ${esc(user.email)}, ${esc(user.phone)}</p><p>E7 Entertainments</p>`;
  return send({ to: user.email, subject: `We've received your request — ${ticket.ref}`, text, html });
}

function sendAccountDeleted(user) {
  const text = `Hi ${user.name},\n\nYour E7 Parks account and the requests you raised with it have been deleted, as you asked.\nIf this wasn't you, please contact us straight away.\n\nE7 Entertainments`;
  const html = `<p>Hi ${esc(user.name)},</p><p>Your E7 Parks account and the requests you raised with it have been deleted, as you asked.</p><p>If this wasn't you, please contact us straight away.</p><p>E7 Entertainments</p>`;
  return send({ to: user.email, subject: 'Your E7 Parks account has been deleted', text, html });
}

module.exports = { sendOtp, sendTicketConfirmation, sendAccountDeleted, esc, smtpConfigured: Boolean(transport) };
