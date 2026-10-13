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
`EXPO_PUBLIC_API_URL=https://internal.e7entertainments.com` in `mobile/.env`.

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
| `SMTP_*`, `MAIL_FROM` | Outgoing email. **While `SMTP_HOST` is empty, emails (including OTP codes) are printed in the server terminal instead of being sent.** |
| `INTERNAL_WEBHOOK_URL` | Optional. Each new ticket is also POSTed there as JSON, for an existing CRM or internal system. |

## Going live on internal.e7entertainments.com

Deploy `server/` to any Node host with a persistent disk (the database is the file `server/data/e7parks.db`),
put it behind HTTPS, point the `internal.e7entertainments.com` DNS record at it, set `TRUST_PROXY=1`, and fill
in the SMTP settings. Staff then open `https://internal.e7entertainments.com/internal`.
# e7parks
