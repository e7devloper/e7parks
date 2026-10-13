// Keep in sync with mobile/src/lib/catalog.ts
const PARK_TYPES = {
  amusement_park: 'Amusement park',
  theme_park: 'Theme park',
  water_park: 'Water park',
  child_playground: "Children's playground",
  indoor_play: 'Indoor play zone / soft play',
  dinosaur_park: 'Dinosaur / animatronic park',
  adventure_park: 'Adventure park',
  snow_park: 'Snow park',
  game_zone: 'Arcade / VR game zone',
  other: 'Other',
};

const TIMELINES = {
  asap: 'As soon as possible',
  '3_6_months': 'In 3–6 months',
  '6_12_months': 'In 6–12 months',
  '12_plus_months': 'More than a year away',
  exploring: 'Just exploring',
};

const CONTACT_METHODS = { email: 'Email', phone: 'Phone call', whatsapp: 'WhatsApp' };

const CURRENCIES = ['INR', 'USD', 'AED', 'EUR'];

const STATUSES = { open: 'Open', in_review: 'In review', quoted: 'Quoted', closed: 'Closed' };

module.exports = { PARK_TYPES, TIMELINES, CONTACT_METHODS, CURRENCIES, STATUSES };
