import { StyleSheet, Text, View } from 'react-native';
import { CONTACT_METHODS, PARK_ICONS, PARK_TYPES, STATUSES, TIMELINES, formatBudget, type Ticket } from '../lib/catalog';
import { fonts, radius, space, type, usePalette, useStyles, type Palette } from '../lib/theme';
import { Icon, type IconName } from './ui';

const NOTCH = 18;

const STEPS = Object.keys(STATUSES) as (keyof typeof STATUSES)[];
const STATUS_NOTES: Record<string, string> = {
  open: 'Received, waiting for the team to pick it up',
  in_review: 'The team is reviewing your request',
  quoted: 'A plan and quote have been shared with you',
  closed: 'This request is closed',
};

type TicketCardProps = { ticket: Ticket; detailed?: boolean; progress?: boolean };

function Row({ icon, children }: { icon: IconName; children: string }) {
  const c = usePalette();
  const styles = useStyles(makeStyles);
  return (
    <View style={styles.row}>
      <Icon name={icon} size={16} color={c.muted} />
      <Text style={styles.rowText}>{children}</Text>
    </View>
  );
}

/**
 * A request drawn as an admission ticket: details above a perforation, reference and status on the stub.
 * `detailed` adds the fields that only matter right after sending; `progress` adds the status track.
 */
export function TicketCard({ ticket, detailed = false, progress = false }: TicketCardProps) {
  const c = usePalette();
  const styles = useStyles(makeStyles);
  const kind = ticket.parkTypes[0];
  const status = c.status[ticket.status] ?? c.status.closed;
  const statusLabel = STATUSES[ticket.status] ?? ticket.status;
  const step = Math.max(0, STEPS.indexOf(ticket.status));
  const title = ticket.parkTypes.map((k) => PARK_TYPES[k] ?? k).join(' · ');

  return (
    <View
      style={styles.card}
      accessible
      accessibilityLabel={`${title}, ${formatBudget(ticket.budget, ticket.currency)}, ${ticket.location}. Status ${statusLabel}, step ${step + 1} of ${STEPS.length}. Reference ${ticket.ref}.`}
    >
      <View style={styles.main}>
        <View style={styles.badge}>
          <Icon name={PARK_ICONS[kind] ?? 'ticket-outline'} size={26} color={c.onSelect} />
        </View>
        <View style={styles.details}>
          <Text style={styles.title}>{title}</Text>
          <Row icon="map-marker-outline">{ticket.location}</Row>
          <Row icon="cash">{formatBudget(ticket.budget, ticket.currency)}</Row>
          <Row icon="calendar-clock">{TIMELINES[ticket.timeline] ?? ticket.timeline}</Row>
          {detailed ? <Row icon="phone-outline">{`Contact by ${(CONTACT_METHODS[ticket.contactMethod] ?? ticket.contactMethod).toLowerCase()}`}</Row> : null}
        </View>
      </View>

      {progress ? (
        <View style={styles.track}>
          <View style={styles.bars}>
            {STEPS.map((s, i) => (
              <View key={s} style={[styles.bar, i <= step && { backgroundColor: status.fg }]} />
            ))}
          </View>
          <Text style={styles.trackText}>
            Step {step + 1} of {STEPS.length}: {STATUS_NOTES[ticket.status] ?? statusLabel}
          </Text>
        </View>
      ) : null}

      <View style={styles.tear}>
        <View style={[styles.notch, styles.notchLeft]} />
        <View style={styles.perforation}>
          {Array.from({ length: 60 }, (_, i) => (
            <View key={i} style={styles.dash} />
          ))}
        </View>
        <View style={[styles.notch, styles.notchRight]} />
      </View>

      <View style={styles.stub}>
        <View>
          <Text style={styles.refLabel}>Ticket</Text>
          <Text style={styles.ref}>{ticket.ref}</Text>
        </View>
        <View style={[styles.status, { backgroundColor: status.bg }]}>
          <Text style={[styles.statusText, { color: status.fg }]}>{statusLabel}</Text>
        </View>
      </View>
    </View>
  );
}

/** Dashed outline in the shape of a ticket, for loading and empty states. */
export function TicketPlaceholder({ children }: { children?: React.ReactNode }) {
  const styles = useStyles(makeStyles);
  return <View style={styles.placeholder}>{children}</View>;
}

const makeStyles = (c: Palette) =>
  StyleSheet.create({
    card: {
      backgroundColor: c.surface,
      borderRadius: radius.lg,
      marginBottom: space.lg,
      shadowColor: c.shadow,
      shadowOpacity: 0.08,
      shadowRadius: 12,
      shadowOffset: { width: 0, height: 4 },
      elevation: 2,
    },
    main: { flexDirection: 'row', gap: space.lg, padding: space.lg, paddingBottom: space.md },
    badge: { width: 52, height: 52, borderRadius: radius.md, backgroundColor: c.select, alignItems: 'center', justifyContent: 'center' },
    details: { flex: 1, gap: space.xs },
    title: { ...type.heading, color: c.heading, marginBottom: space.xs },
    row: { flexDirection: 'row', alignItems: 'center', gap: space.sm },
    rowText: { ...type.caption, fontSize: 14, color: c.text, flex: 1 },

    track: { paddingHorizontal: space.lg, paddingBottom: space.md, gap: space.sm },
    bars: { flexDirection: 'row', gap: space.xs },
    bar: { flex: 1, height: 6, borderRadius: 3, backgroundColor: c.line },
    trackText: { ...type.caption, color: c.text },

    tear: { height: NOTCH, justifyContent: 'center' },
    // The notches take the page colour so the card reads as punched at the perforation.
    notch: { position: 'absolute', width: NOTCH, height: NOTCH, borderRadius: NOTCH / 2, backgroundColor: c.ground },
    notchLeft: { left: -NOTCH / 2 },
    notchRight: { right: -NOTCH / 2 },
    perforation: { flexDirection: 'row', gap: 5, marginHorizontal: NOTCH, overflow: 'hidden' },
    dash: { width: 6, height: 2, borderRadius: 1, backgroundColor: c.line },

    stub: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: space.md, paddingHorizontal: space.lg, paddingTop: space.sm, paddingBottom: space.lg },
    refLabel: { ...type.caption, color: c.muted },
    ref: { fontFamily: fonts.displayMedium, fontSize: 15, lineHeight: 20, letterSpacing: 0.5, color: c.heading, fontVariant: ['tabular-nums'] },
    status: { borderRadius: radius.pill, paddingHorizontal: space.md, paddingVertical: 6 },
    statusText: { ...type.caption, fontWeight: '700' },

    placeholder: {
      borderRadius: radius.lg,
      borderWidth: 1.5,
      borderStyle: 'dashed',
      borderColor: c.inputBorder,
      padding: space.xl,
      marginBottom: space.lg,
      minHeight: 150,
      alignItems: 'center',
      justifyContent: 'center',
    },
  });
