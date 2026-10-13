import { useRouter } from 'expo-router';
import { useState } from 'react';
import { FlatList, RefreshControl, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { TicketCard, TicketPlaceholder } from '../../../components/ticket';
import { Button, ErrorText, Icon } from '../../../components/ui';
import { useTickets } from '../../../lib/tickets';
import { CONTENT_MAX_WIDTH, radius, space, type, usePalette, useStyles, type Palette } from '../../../lib/theme';

export default function Requests() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const c = usePalette();
  const styles = useStyles(makeStyles);
  const { tickets, error, reload } = useTickets();
  const [refreshing, setRefreshing] = useState(false);

  return (
    <FlatList
      style={styles.flex}
      data={tickets ?? []}
      keyExtractor={(t) => String(t.id)}
      renderItem={({ item }) => <TicketCard ticket={item} progress />}
      contentContainerStyle={[styles.list, { paddingLeft: insets.left + space.xl, paddingRight: insets.right + space.xl }]}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          tintColor={c.link}
          onRefresh={async () => {
            setRefreshing(true);
            await reload();
            setRefreshing(false);
          }}
        />
      }
      ListHeaderComponent={
        <>
          {tickets?.length ? <Text style={styles.lead}>Pull down to check for updates from the E7 team.</Text> : null}
          {error ? (
            <View style={styles.error}>
              <ErrorText>{error}</ErrorText>
              <Button title="Try again" variant="text" icon="refresh" onPress={reload} />
            </View>
          ) : null}
        </>
      }
      ListEmptyComponent={
        tickets === null ? (
          error ? null : (
            <View accessibilityLabel="Loading your requests">
              <View style={styles.skeleton} />
              <View style={styles.skeleton} />
            </View>
          )
        ) : (
          <>
            <TicketPlaceholder>
              <Icon name="ticket-outline" size={36} color={c.muted} />
              <Text style={styles.emptyTitle}>Your first ticket will appear here</Text>
              <Text style={styles.emptyText}>
                Pick the kind of park, give us a budget and a location, and you can follow its status from this tab.
              </Text>
            </TicketPlaceholder>
            <Button title="Raise a new request" icon="plus" onPress={() => router.push('/new-request')} />
          </>
        )
      }
    />
  );
}

const makeStyles = (c: Palette) =>
  StyleSheet.create({
    flex: { flex: 1, backgroundColor: c.ground },
    list: { paddingTop: space.xl, paddingBottom: space.xl, flexGrow: 1, width: '100%', maxWidth: CONTENT_MAX_WIDTH + space.xl * 2, alignSelf: 'center' },
    lead: { ...type.caption, fontSize: 14, color: c.muted, marginBottom: space.lg },
    error: { marginBottom: space.lg },
    skeleton: { height: 200, borderRadius: radius.lg, backgroundColor: c.surfaceAlt, marginBottom: space.lg },
    emptyTitle: { ...type.heading, color: c.heading, marginTop: space.md, textAlign: 'center' },
    emptyText: { ...type.body, fontSize: 15, color: c.muted, textAlign: 'center', marginTop: space.sm },
  });
