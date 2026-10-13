import { useRouter } from 'expo-router';
import { useRef, useState } from 'react';
import { StyleSheet, Text, type ScrollView } from 'react-native';
import { Button, Choice, ErrorText, Field, Screen, Section } from '../../components/ui';
import { errorMessage } from '../../lib/api';
import { useAuth } from '../../lib/auth';
import {
  CONTACT_ICONS,
  CONTACT_METHODS,
  CURRENCIES,
  PARK_ICONS,
  PARK_TYPES,
  TIMELINES,
  budgetInWords,
  formatBudget,
  type ContactMethod,
  type Currency,
  type ParkType,
  type Ticket,
  type Timeline,
} from '../../lib/catalog';
import { space, type, useStyles, type Palette } from '../../lib/theme';

const keys = <T extends object>(o: T) => Object.keys(o) as (keyof T & string)[];
const digits = (s: string) => s.replace(/\D/g, '');

const PARK_OPTIONS = keys(PARK_TYPES).map((k) => ({ value: k, label: PARK_TYPES[k], icon: PARK_ICONS[k] }));
const CURRENCY_OPTIONS = CURRENCIES.map((c) => ({ value: c, label: c }));
const TIMELINE_OPTIONS = keys(TIMELINES).map((k) => ({ value: k, label: TIMELINES[k] }));
const CONTACT_OPTIONS = keys(CONTACT_METHODS).map((k) => ({ value: k, label: CONTACT_METHODS[k], icon: CONTACT_ICONS[k] }));

type Errors = Partial<Record<'parkType' | 'budget' | 'location' | 'timeline' | 'notes', string>>;

export default function NewRequest() {
  const router = useRouter();
  const { user, api } = useAuth();
  const styles = useStyles(makeStyles);
  const scrollRef = useRef<ScrollView>(null);
  const [parkType, setParkType] = useState<ParkType | null>(null);
  const [budget, setBudget] = useState('');
  const [currency, setCurrency] = useState<Currency>('INR');
  const [location, setLocation] = useState('');
  const [siteArea, setSiteArea] = useState('');
  const [visitors, setVisitors] = useState('');
  const [timeline, setTimeline] = useState<Timeline | null>(null);
  const [contactMethod, setContactMethod] = useState<ContactMethod>('email');
  const [notes, setNotes] = useState('');
  const [errors, setErrors] = useState<Errors>({});
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const amount = Number(budget);
  const words = amount ? budgetInWords(amount, currency) : null;

  async function submit() {
    const found: Errors = {};
    if (!parkType) found.parkType = 'Choose the kind of park.';
    if (!amount) found.budget = 'Enter your budget. A rough figure is fine.';
    if (location.trim().length < 2) found.location = 'Tell us where the park will be.';
    if (!timeline) found.timeline = 'Choose when you would like to start.';
    if (parkType === 'other' && !notes.trim()) found.notes = 'Describe the park you have in mind.';
    setErrors(found);
    const missing = Object.keys(found).length;
    if (missing) {
      setError(missing === 1 ? Object.values(found)[0] : `${missing} things still need your attention. They're marked above.`);
      // Park type is at the top of a long form; bring it back into view if that's what is missing.
      if (found.parkType) scrollRef.current?.scrollTo({ y: 0, animated: true });
      return;
    }

    setError(null);
    setBusy(true);
    try {
      const res = await api<{ ticket: Ticket; emailSent: boolean }>('/tickets', {
        method: 'POST',
        body: {
          parkTypes: [parkType],
          budget: amount,
          currency,
          location,
          siteArea,
          expectedVisitors: visitors ? Number(visitors) : null,
          timeline,
          contactMethod,
          notes,
        },
      });
      router.replace({ pathname: '/submitted', params: { ticket: JSON.stringify(res.ticket), emailSent: res.emailSent ? '1' : '0' } });
    } catch (e) {
      setError(errorMessage(e));
      setBusy(false);
    }
  }

  return (
    <Screen ref={scrollRef}>
      <Section title="The park">
        <Choice
          label="What would you like to build?"
          layout="tiles"
          options={PARK_OPTIONS}
          value={parkType}
          onChange={setParkType}
          error={errors.parkType}
        />
      </Section>

      <Section title="Budget and site" description="A rough figure is fine. Only the E7 team sees it.">
        <Choice label="Currency" layout="segments" options={CURRENCY_OPTIONS} value={currency} onChange={setCurrency} />
        <Field
          label="Total budget"
          value={budget}
          onChangeText={(t) => setBudget(digits(t).slice(0, 13))}
          error={errors.budget}
          placeholder="25000000"
          keyboardType="number-pad"
          hint={amount ? `${formatBudget(amount, currency)}${words ? `  ·  ${words}` : ''}` : 'Your overall budget for the project.'}
        />
        <Field
          label="Location"
          value={location}
          onChangeText={setLocation}
          error={errors.location}
          placeholder="City, country"
          maxLength={120}
          autoComplete="off"
        />
        <Field label="Site area" optional value={siteArea} onChangeText={setSiteArea} placeholder="5 acres or 20,000 sq ft" maxLength={60} />
        <Field
          label="Expected visitors per day"
          optional
          value={visitors}
          onChangeText={(t) => setVisitors(digits(t).slice(0, 7))}
          placeholder="2000"
          keyboardType="number-pad"
        />
      </Section>

      <Section title="Timing and contact">
        <Choice
          label="When would you like to start?"
          options={TIMELINE_OPTIONS}
          value={timeline}
          onChange={setTimeline}
          error={errors.timeline}
        />
        <Choice
          label="How should we reach you?"
          layout="segments"
          options={CONTACT_OPTIONS}
          value={contactMethod}
          onChange={setContactMethod}
        />
        <Field
          label="Anything else we should know?"
          optional={parkType !== 'other'}
          value={notes}
          onChangeText={setNotes}
          error={errors.notes}
          placeholder="Theme ideas, must-have rides, age groups, whether you already own the land"
          multiline
          maxLength={2000}
          textAlignVertical="top"
          style={styles.notes}
        />
      </Section>

      <ErrorText>{error}</ErrorText>
      <Button title="Send request" icon="send" onPress={submit} loading={busy} />
      <Text style={styles.footnote}>We'll email a copy of this request to {user?.email}.</Text>
    </Screen>
  );
}

const makeStyles = (c: Palette) =>
  StyleSheet.create({
    notes: { minHeight: 120 },
    footnote: { ...type.caption, color: c.muted, textAlign: 'center', marginTop: space.md },
  });
