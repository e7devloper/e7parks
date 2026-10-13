// Keep in sync with server/src/catalog.js
export const PARK_TYPES = {
  amusement_park: 'Amusement park',
  theme_park: 'Theme park',
  water_park: 'Water park',
  child_playground: "Children's playground",
  indoor_play: 'Indoor play zone',
  dinosaur_park: 'Dinosaur park',
  adventure_park: 'Adventure park',
  snow_park: 'Snow park',
  game_zone: 'Arcade / VR zone',
  other: 'Other',
} as const;

export const TIMELINES = {
  asap: 'As soon as possible',
  '3_6_months': '3–6 months',
  '6_12_months': '6–12 months',
  '12_plus_months': 'Over a year',
  exploring: 'Just exploring',
} as const;

export const CONTACT_METHODS = { email: 'Email', phone: 'Phone call', whatsapp: 'WhatsApp' } as const;

export const CURRENCIES = ['INR', 'USD', 'AED', 'EUR'] as const;

export const STATUSES = { open: 'Open', in_review: 'In review', quoted: 'Quoted', closed: 'Closed' } as const;

export type ParkType = keyof typeof PARK_TYPES;
export type Timeline = keyof typeof TIMELINES;
export type ContactMethod = keyof typeof CONTACT_METHODS;
export type Currency = (typeof CURRENCIES)[number];
export type Status = keyof typeof STATUSES;

export type Ticket = {
  id: number;
  ref: string;
  parkTypes: ParkType[];
  budget: number;
  currency: Currency;
  location: string;
  siteArea: string | null;
  expectedVisitors: number | null;
  timeline: Timeline;
  contactMethod: ContactMethod;
  notes: string | null;
  status: Status;
  createdAt: string;
};

/** One icon per option, all from MaterialCommunityIcons so stroke and weight stay consistent. */
export const PARK_ICONS = {
  amusement_park: 'ferris-wheel',
  theme_park: 'castle',
  water_park: 'waves',
  child_playground: 'slide',
  indoor_play: 'toy-brick-outline',
  dinosaur_park: 'bone',
  adventure_park: 'hiking',
  snow_park: 'snowflake',
  game_zone: 'controller-classic',
  other: 'dots-horizontal',
} as const satisfies Record<ParkType, string>;

export const CONTACT_ICONS = {
  email: 'email-outline',
  phone: 'phone-outline',
  whatsapp: 'whatsapp',
} as const satisfies Record<ContactMethod, string>;

/** "2.5 crore" / "25 million": a readable echo of a long budget figure. */
export function budgetInWords(amount: number, currency: string) {
  const round = (n: number) => Number(n.toFixed(2)).toLocaleString('en-US');
  if (currency === 'INR') {
    if (amount >= 1e7) return `${round(amount / 1e7)} crore`;
    if (amount >= 1e5) return `${round(amount / 1e5)} lakh`;
    return null;
  }
  if (amount >= 1e9) return `${round(amount / 1e9)} billion`;
  if (amount >= 1e6) return `${round(amount / 1e6)} million`;
  return null;
}

export const formatBudget = (amount: number, currency: string) =>
  `${currency} ${amount.toLocaleString(currency === 'INR' ? 'en-IN' : 'en-US')}`;
