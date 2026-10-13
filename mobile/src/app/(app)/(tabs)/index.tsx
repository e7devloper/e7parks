import { useRouter } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';
import { TicketCard } from '../../../components/ticket';
import { Button, ErrorText, Screen } from '../../../components/ui';
import { useAuth } from '../../../lib/auth';
import { STATUSES, type Status } from '../../../lib/catalog';
import { useTickets } from '../../../lib/tickets';
import { radius, space, type, usePalette, useStyles, type Palette } from '../../../lib/theme';

const ACTIVE: Status[] = ['open', 'in_review', 'quoted'];

export default function Home() {
  const router = useRouter();
  const c = usePalette();
  const styles = useStyles(makeStyles);
  const { user } = useAuth();
  const { tickets, error, reload } = useTickets();

  const active = tickets?.filter((t) => ACTIVE.includes(t.status)) ?? [];
  const latest = tickets?.[0];

  return (
    <Screen>
      <Text accessibilityRole="header" style={styles.hello}>
        Hi {user?.name.split(' ')[0]}
      </Text>
      <Text style={styles.lead}>
        {active.length
          ? `You have ${active.length} active ${active.length === 1 ? 'request' : 'requests'} with the E7 team.`
          : 'Tell us about the park you want to build. The E7 team will come back with a plan and a quote.'}
      </Text>

      <Button title="Raise a new request" icon="plus" onPress={() => router.push('/new-request')} />

      {error ? (
        <View style={styles.block}>
          <ErrorText>{error}</ErrorText>
          <Button title="Try again" variant="text" icon="refresh" onPress={reload} />
        </View>
      ) : null}

      {active.length ? (
        <View style={styles.block}>
          <View style={styles.counts}>
            {ACTIVE.map((s) => (
              <View key={s} style={[styles.count, { backgroundColor: c.status[s].bg }]}>
                <Text style={[styles.countNumber, { color: c.status[s].fg }]}>{active.filter((t) => t.status === s).length}</Text>
                <Text style={[styles.countLabel, { color: c.status[s].fg }]}>{STATUSES[s]}</Text>
              </View>
            ))}
          </View>
        </View>
      ) : null}

      {latest ? (
        <View style={styles.block}>
          <Text accessibilityRole="header" style={styles.sectionTitle}>
            Latest request
          </Text>
          <TicketCard ticket={latest} />
          {tickets && tickets.length > 1 ? (
            <Button title={`See all ${tickets.length} requests`} variant="text" icon="chevron-right" onPress={() => router.push('/requests')} />
          ) : null}
        </View>
      ) : null}
    </Screen>
  );
}

const makeStyles = (c: Palette) =>
  StyleSheet.create({
    hello: { ...type.display, color: c.heading },
    lead: { ...type.body, color: c.muted, marginTop: space.sm, marginBottom: space.xl },
    block: { marginTop: space.xxl },
    sectionTitle: { ...type.title, color: c.heading, marginBottom: space.lg },
    counts: { flexDirection: 'row', gap: space.sm },
    count: { flex: 1, borderRadius: radius.md, paddingVertical: space.md, paddingHorizontal: space.md },
    countNumber: { ...type.display, fontSize: 24, lineHeight: 28 },
    countLabel: { ...type.caption, fontWeight: '600', marginTop: 2 },
  });
