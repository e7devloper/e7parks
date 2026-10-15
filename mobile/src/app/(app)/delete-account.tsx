import { useState } from 'react';
import { Alert, Platform, StyleSheet, Text, View } from 'react-native';
import { Button, ErrorText, Field, Icon, Screen } from '../../components/ui';
import { errorMessage } from '../../lib/api';
import { useAuth } from '../../lib/auth';
import { radius, space, type, usePalette, useStyles, type Palette } from '../../lib/theme';

const LOSSES = [
  'Your name, email address, phone number and password',
  'Every request you have raised, including any the E7 team is still working on',
];

export default function DeleteAccount() {
  const c = usePalette();
  const styles = useStyles(makeStyles);
  const { user, api, signOut } = useAuth();
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit() {
    if (!password) return setError('Enter your password to confirm.');
    setError(null);
    setBusy(true);
    try {
      await api('/auth/delete-account', { method: 'POST', body: { password } });
      // Signing out flips the root guard, which returns the user to the login screen.
      await signOut();
      // Alert.alert does nothing in the browser build.
      if (Platform.OS !== 'web') Alert.alert('Account deleted', 'Your account and requests have been removed.');
    } catch (e) {
      setError(errorMessage(e));
      setBusy(false);
    }
  }

  return (
    <Screen>
      <Text accessibilityRole="header" style={styles.title}>
        Delete your account?
      </Text>
      <Text style={styles.lead}>This is permanent and can't be undone. We will delete:</Text>
      <View style={styles.group}>
        {LOSSES.map((line) => (
          <View key={line} style={styles.row}>
            <Icon name="close-circle-outline" size={20} color={c.danger} />
            <Text style={styles.rowText}>{line}</Text>
          </View>
        ))}
      </View>
      <ErrorText>{error}</ErrorText>
      <Field
        label="Password"
        value={password}
        onChangeText={setPassword}
        placeholder="Your password"
        hint={`Confirms that ${user?.email} is your account.`}
        secureTextEntry
        autoComplete="current-password"
        textContentType="password"
        returnKeyType="done"
      />
      <Button title="Delete my account" variant="danger" icon="delete-outline" onPress={submit} loading={busy} />
    </Screen>
  );
}

const makeStyles = (c: Palette) =>
  StyleSheet.create({
    title: { ...type.title, color: c.heading },
    lead: { ...type.body, color: c.text, marginTop: space.sm, marginBottom: space.lg },
    group: { backgroundColor: c.surface, borderRadius: radius.lg, padding: space.lg, gap: space.md, marginBottom: space.xl },
    row: { flexDirection: 'row', gap: space.md, alignItems: 'flex-start' },
    rowText: { ...type.body, color: c.heading, flex: 1 },
  });
