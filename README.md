# E7 Parks

Mobile app for raising park project requests with E7 Entertainments, plus the API and staff dashboard behind it.

- `mobile/` — Expo (SDK 57) + React Native app, runs in Expo Go.
- `server/` — Node/Express API with a SQLite database and the internal ticket dashboard (`/internal`).

## Run it

Needs Node 22.13+.

```sh
# 1. API + dashboard (http://localhost:4000)
cd server
npm install
npm run dev

# 2. App, in a second terminal
cd mobile
npm install
npx expo start
```

Scan the QR code with Expo Go. The phone and computer must be on the same Wi-Fi; the app finds the server
on the computer's LAN address automatically. To use a deployed server (or `expo start --tunnel`), set
`EXPO_PUBLIC_API_URL=https://api.e7entertainments.com` in `mobile/.env.local`.

## Flow

1. **Create account** — name, email, phone, password. A 6-digit code is emailed (10 minute expiry,
   5 attempts, 60s resend cooldown). The account can't log in until the code is verified.
2. **Log in** — email + password. The session is kept in the device keychain.
3. **Raise a request** — park type(s), budget and currency, location, site area, expected daily visitors,
   timeline, preferred contact method, additional information.
4. **Send** — saves a ticket (e.g. `E7-20261013-068128`), shows it on the staff dashboard, and emails the
   requester a confirmation with everything they submitted.

## Configuration (`server/.env`)

See `server/.env.example`. The important ones:

| Variable | Purpose |
| --- | --- |
| `JWT_SECRET` | Signs sessions. Required. |
| `ADMIN_USER` / `ADMIN_PASSWORD` | Login for the staff dashboard at `/internal`. |
| `RESEND_API_KEY`, `MAIL_FROM` | Outgoing email via [Resend](https://resend.com) (production; Railway Hobby blocks outbound SMTP). `MAIL_FROM` must be on a domain verified in Resend. |
| `SMTP_*` | Alternative to Resend for local or self-hosted setups. **While both `RESEND_API_KEY` and `SMTP_HOST` are empty, emails (including OTP codes) are printed in the server terminal instead of being sent.** |
| `SUPPORT_EMAIL` | Contact address shown on the public privacy and account deletion pages. |
| `INTERNAL_WEBHOOK_URL` | Optional. Each new ticket is also POSTed there as JSON (`ticket.created`), for an existing CRM or internal system. Deleting an account sends `account.deleted` with the ticket references to purge. |

## Public website form (`/api/web-leads`)

The "Request a Park" form on `e7entertainments.com` (repo `e7-entertainment`) posts straight to `POST /api/web-leads`
from the browser — no account or login. Body: `{ name, email, phone }` plus the same ticket fields as `POST
/api/tickets` (see `server/src/tickets.js`'s `validateTicketFields`). It finds or creates a user behind the scenes
(unverified, a password nobody will ever use) and raises a ticket exactly like the app does, so it shows up on the
staff dashboard and sends the same confirmation email. Rate limited to 10 requests/hour per IP.

## Staff API (`/api/staff`)

The staff web app at `internal.e7entertainments.com` is a separate project (repo `e7-internal`); the full API
contract is in that repo's README. Staff have individual accounts (`staff` table) and sign in with
`POST /api/staff/login` `{ email, password }`, which returns a 12-hour token for `Authorization: Bearer <token>`.
Admins manage accounts through `/api/staff/team`. Status changes are recorded with who made them
(`ticket_events`); a status changed there shows in the mobile app the next time the client's requests load.

`ADMIN_USER` / `ADMIN_PASSWORD` is a built-in admin login (enter `ADMIN_USER` in the email field) used to create the
first accounts. The older built-in dashboard at `/internal` still works with it.

## Going live

The server runs on Railway (project `e7-parks`, service `e7-parks-server`) with the database on a volume mounted
at `/data` (`DATABASE_FILE=/data/e7parks.db`). Deploy with `railway up` from `server/`.

- `api.e7entertainments.com` points at the Railway service; the mobile store builds use it (`mobile/eas.json`).
- `internal.e7entertainments.com` is the staff web app, on Vercel (repo `e7-internal`).
