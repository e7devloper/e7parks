require('dotenv').config({ quiet: true });

if (!process.env.JWT_SECRET || process.env.JWT_SECRET.length < 32) {
  console.error('JWT_SECRET is missing or too short. Copy .env.example to .env and set it (32+ random characters).');
  process.exit(1);
}

const os = require('node:os');
const express = require('express');
const cors = require('cors');
const auth = require('./auth');
const tickets = require('./tickets');
const internal = require('./internal');
const staff = require('./staff');
const pages = require('./pages');
const { smtpConfigured } = require('./mailer');

const app = express();
// Needed behind a reverse proxy so rate limiting sees the real client IP.
if (process.env.TRUST_PROXY) app.set('trust proxy', Number(process.env.TRUST_PROXY) || 1);
app.disable('x-powered-by');

app.get('/health', (_req, res) => res.json({ ok: true }));
app.use('/internal', internal.router);
app.use(pages.router);

const api = express.Router();
api.use(cors());
api.use(express.json({ limit: '50kb' }));
api.use('/auth', auth.router);
api.use('/tickets', tickets.router);
api.use('/staff', staff.router);
app.use('/api', api);

app.use((_req, res) => res.status(404).json({ error: 'Not found.' }));
app.use((err, _req, res, _next) => {
  if (err instanceof auth.HttpError) return res.status(err.status).json({ error: err.message, code: err.code });
  if (err.type === 'entity.parse.failed' || err.type === 'entity.too.large') return res.status(400).json({ error: 'Invalid request.' });
  console.error(err);
  res.status(500).json({ error: 'Something went wrong on our side. Please try again.' });
});

const port = Number(process.env.PORT || 4000);
app.listen(port, () => {
  const lan = Object.values(os.networkInterfaces()).flat().find((i) => i && i.family === 'IPv4' && !i.internal)?.address;
  console.log(`E7 Parks API      http://localhost:${port}/api${lan ? `  (LAN: http://${lan}:${port})` : ''}`);
  console.log(`Internal tickets  http://localhost:${port}/internal`);
  if (!smtpConfigured) console.log('Email not configured (RESEND_API_KEY or SMTP_HOST): OTP codes and confirmation emails are printed here instead of being sent.');
});
