import { useRouter } from 'expo-router';
import { Alert, Linking, Platform, StyleSheet, Text, View } from 'react-native';
import { Button, Icon, Screen, type IconName } from '../../../components/ui';
import { useAuth } from '../../../lib/auth';
import { PRIVACY_URL } from '../../../lib/config';
import { radius, space, type, usePalette, useStyles, type Palette } from '../../../lib/theme';

export default function Account() {
  const router = useRouter();
  const c = usePalette();
  const styles = useStyles(makeStyles);
  const { user, signOut } = useAuth();

  function confirmSignOut() {
    // Alert.alert does nothing in the browser build.
    if (Platform.OS === 'web') {
      if (window.confirm('Log out?')) signOut();
      return;
    }
    Alert.alert('Log out?', 'You can log back in any time.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Log out', style: 'destructive', onPress: signOut },
    ]);
  }

  const rows: [IconName, string, string | undefined][] = [
    ['account-outline', 'Name', user?.name],
    ['email-outline', 'Email', user?.email],
    ['phone-outline', 'Phone', user?.phone],
  ];

  return (
    <Screen>
      <View style={styles.group}>
        {rows.map(([icon, label, value], i) => (
          <View key={label} style={[styles.row, i > 0 && styles.divider]} accessible accessibilityLabel={`${label}: ${value}`}>
            <Icon name={icon} size={22} color={c.muted} />
            <View style={styles.rowText}>
              <Text style={styles.label}>{label}</Text>
              <Text style={styles.value}>{value}</Text>
            </View>
          </View>
        ))}
      </View>
      <Text style={styles.note}>The E7 team uses these details to reply to your requests.</Text>
      <Button title="Privacy policy" variant="text" icon="shield-account-outline" onPress={() => Linking.openURL(PRIVACY_URL)} />
      <Button title="Log out" variant="text" icon="logout" onPress={confirmSignOut} />
      <Button title="Delete account" variant="text" icon="delete-outline" onPress={() => router.push('/delete-account')} />
    </Screen>
  );
}

const makeStyles = (c: Palette) =>
  StyleSheet.create({
    group: { backgroundColor: c.surface, borderRadius: radius.lg, paddingHorizontal: space.lg },
    row: { flexDirection: 'row', alignItems: 'center', gap: space.lg, paddingVertical: space.md, minHeight: 64 },
    divider: { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: c.line },
    rowText: { flex: 1 },
    label: { ...type.caption, color: c.muted },
    value: { ...type.body, color: c.heading },
    note: { ...type.caption, color: c.muted, marginTop: space.md, marginBottom: space.xl, marginHorizontal: space.xs },
  });
