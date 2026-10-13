// Creates (or resets) a pre-verified sample client with a few requests at different stages,
// so the app can be shown without going through sign-up. Safe to run repeatedly.
require('dotenv').config({ quiet: true });
const bcrypt = require('bcryptjs');
const db = require('./db');

// The .example domain can never receive mail, so confirmation emails for this account go nowhere.
const client = { name: 'Priya Nair', email: 'priya.nair@lakeviewresorts.example', phone: '+91 98470 21536', password: 'Lakeview@2026' };

const requests = [
  {
    ref: 'E7-20260618-4C91A7', created: '2026-06-18T05:42:10.000Z', status: 'closed',
    parkTypes: ['child_playground'], budget: 3500000, currency: 'INR', location: 'Coimbatore, India',
    siteArea: '8,000 sq ft', visitors: 250, timeline: 'asap', contact: 'phone',
    notes: 'Outdoor play area for the family wing of our Coimbatore property. Ages 3 to 12, rubber safety flooring, shaded seating for parents.',
  },
  {
    ref: 'E7-20260827-9E03D2', created: '2026-08-27T09:15:44.000Z', status: 'quoted',
    parkTypes: ['water_park'], budget: 180000000, currency: 'INR', location: 'Kochi, India',
    siteArea: '12 acres', visitors: 3500, timeline: '6_12_months', contact: 'whatsapp',
    notes: 'Land is owned and adjoins our backwater resort. We want a wave pool, a lazy river and at least six slides, with a separate toddler zone. Monsoon drainage is a concern.',
  },
  {
    ref: 'E7-20260930-B7F250', created: '2026-09-30T11:03:27.000Z', status: 'in_review',
    parkTypes: ['indoor_play'], budget: 12000000, currency: 'INR', location: 'Bengaluru, India',
    siteArea: '6,500 sq ft', visitors: 600, timeline: '3_6_months', contact: 'email',
    notes: 'Third-floor unit in a mall we lease in Whitefield. Soft play, trampolines and two party rooms. Ceiling height is 4.2 m.',
  },
  {
    ref: 'E7-20261009-2A6E18', created: '2026-10-09T06:28:53.000Z', status: 'open',
    parkTypes: ['dinosaur_park'], budget: 9000000, currency: 'AED', location: 'Ras Al Khaimah, UAE',
    siteArea: '4 hectares', visitors: 1800, timeline: '12_plus_months', contact: 'whatsapp',
    notes: 'Early-stage idea with a partner in the UAE. Interested in animatronic dinosaurs along a shaded walking trail, plus a fossil dig area for children.',
  },
];

// Earlier versions of this script created a generic "Demo User"; remove it if it never raised anything.
db.prepare(
  `DELETE FROM users WHERE email = 'demo@e7entertainments.com' AND id NOT IN (SELECT user_id FROM tickets)`
).run();

db.prepare(
  `INSERT INTO users (name, email, phone, password_hash, verified, created_at) VALUES (?, ?, ?, ?, 1, ?)
   ON CONFLICT(email) DO UPDATE SET name = excluded.name, phone = excluded.phone,
     password_hash = excluded.password_hash, verified = 1`
).run(client.name, client.email, client.phone, bcrypt.hashSync(client.password, 10), '2026-06-17T13:20:00.000Z');
const { id } = db.prepare('SELECT id FROM users WHERE email = ?').get(client.email);

const insert = db.prepare(
  `INSERT INTO tickets (ref, user_id, park_types, budget, currency, location, site_area, expected_visitors,
     timeline, contact_method, notes, status, email_sent, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?)
   ON CONFLICT(ref) DO UPDATE SET status = excluded.status`
);
for (const r of requests) {
  insert.run(r.ref, id, JSON.stringify(r.parkTypes), r.budget, r.currency, r.location, r.siteArea, r.visitors,
    r.timeline, r.contact, r.notes, r.status, r.created);
}

console.log(`Sample client ready with ${requests.length} requests\n  Email:    ${client.email}\n  Password: ${client.password}`);
