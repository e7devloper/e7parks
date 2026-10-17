import * as Haptics from 'expo-haptics';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { AccessibilityInfo, Animated, Easing, Platform, StyleSheet, Text, View } from 'react-native';
import { TicketCard } from '../../components/ticket';
import { Button, Icon, Screen } from '../../components/ui';
import { useAuth } from '../../lib/auth';
import { CONTACT_METHODS, type Ticket } from '../../lib/catalog';
import { space, type, usePalette, useStyles, type Palette } from '../../lib/theme';

export default function Submitted() {
  const router = useRouter();
  const { user } = useAuth();
  const c = usePalette();
  const styles = useStyles(makeStyles);
  const params = useLocalSearchParams<{ ticket: string; emailSent: string }>();
  const ticket = useMemo(() => {
    try {
      return JSON.parse(params.ticket) as Ticket;
    } catch {
      return null;
    }
  }, [params.ticket]);

  // The one authored moment in the app: the ticket is issued, sliding out from under the header.
  const [issued] = useState(() => new Animated.Value(0));
  useEffect(() => {
    if (Platform.OS !== 'web') Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
    AccessibilityInfo.isReduceMotionEnabled().then((reduce) => {
      if (reduce) return issued.setValue(1);
      Animated.timing(issued, { toValue: 1, duration: 520, delay: 120, easing: Easing.out(Easing.exp), useNativeDriver: true }).start();
    });
  }, [issued]);

  const how = ticket ? (CONTACT_METHODS[ticket.contactMethod] ?? ticket.contactMethod) : null;

  return (
    <Screen footer={<Button title="Back to my requests" onPress={() => router.dismissTo('/')} />}>
      <View style={styles.heading}>
        <Icon name="check-circle" size={28} color={c.success} />
        <Text accessibilityRole="header" style={styles.title}>
          It's with the E7 team
        </Text>
      </View>
      <Text style={styles.text}>
        {how === 'Email'
          ? 'Someone from E7 Entertainments will reply by email.'
          : `Someone from E7 Entertainments will reach you by ${how === 'WhatsApp' ? 'WhatsApp' : 'phone'} on ${user?.phone}.`}
      </Text>

      {ticket ? (
        <Animated.View
          style={[
            styles.ticket,
            { opacity: issued, transform: [{ translateY: issued.interpolate({ inputRange: [0, 1], outputRange: [-28, 0] }) }] },
          ]}
        >
          <TicketCard ticket={ticket} detailed />
        </Animated.View>
      ) : null}

      <Text style={styles.note}>
        {params.emailSent === '1'
          ? `A copy of everything you submitted is on its way to ${user?.email}.`
          : "We couldn't send the confirmation email just now. Your request is saved and nothing is lost."}
      </Text>
    </Screen>
  );
}

const makeStyles = (c: Palette) =>
  StyleSheet.create({
    heading: { flexDirection: 'row', alignItems: 'center', gap: space.sm },
    title: { ...type.display, fontSize: 24, lineHeight: 30, color: c.heading, flex: 1 },
    text: { ...type.body, color: c.text, marginTop: space.sm },
    ticket: { marginTop: space.xl },
    note: { ...type.caption, fontSize: 14, color: c.muted, marginTop: space.xs },
  });
