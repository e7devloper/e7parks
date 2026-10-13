import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { StyleSheet, Text } from 'react-native';
import { Button, ErrorText, Field, Screen } from '../../components/ui';
import { errorMessage, request } from '../../lib/api';
import { useAuth, type User } from '../../lib/auth';
import { fonts, space, type, useStyles, type Palette } from '../../lib/theme';

const RESEND_AFTER_S = 60;

export default function Verify() {
  const router = useRouter();
  const { email } = useLocalSearchParams<{ email: string }>();
  const { signIn } = useAuth();
  const styles = useStyles(makeStyles);
  const [code, setCode] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [resending, setResending] = useState(false);
  const [wait, setWait] = useState(RESEND_AFTER_S);

  useEffect(() => {
    if (wait <= 0) return;
    const t = setTimeout(() => setWait((s) => s - 1), 1000);
    return () => clearTimeout(t);
  }, [wait]);

  async function verify(value: string) {
    if (busy) return;
    if (value.length !== 6) return setError('Enter the 6-digit code from your email.');
    setError(null);
    setNotice(null);
    setBusy(true);
    try {
      // Signing in flips the root guard, which moves the user into the app.
      await signIn(await request<{ token: string; user: User }>('/auth/verify-otp', { method: 'POST', body: { email, code: value } }));
    } catch (e) {
      setError(errorMessage(e));
      setBusy(false);
    }
  }

  function onChange(text: string) {
    const digits = text.replace(/\D/g, '').slice(0, 6);
    setCode(digits);
    if (digits.length === 6) verify(digits);
  }

  async function resend() {
    setError(null);
    setNotice(null);
    setResending(true);
    try {
      await request('/auth/resend-otp', { method: 'POST', body: { email } });
      setNotice('A new code is on its way.');
      setCode('');
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setWait(RESEND_AFTER_S);
      setResending(false);
    }
  }

  return (
    <Screen>
      <Text style={styles.lead}>
        Enter the 6-digit code we sent to <Text style={styles.email}>{email}</Text>. It expires in 10 minutes.
      </Text>
      <ErrorText>{error}</ErrorText>
      {notice ? <Text style={styles.notice}>{notice}</Text> : null}
      <Field
        label="Verification code"
        value={code}
        onChangeText={onChange}
        placeholder="000000"
        hint="Can't see it? Check your spam or junk folder."
        keyboardType="number-pad"
        maxLength={6}
        autoFocus
        autoComplete="one-time-code"
        textContentType="oneTimeCode"
        style={styles.code}
      />
      <Button title="Verify and continue" onPress={() => verify(code)} loading={busy} />
      <Button
        title={wait > 0 ? `Resend code in ${wait}s` : 'Resend code'}
        variant="text"
        onPress={resend}
        disabled={wait > 0}
        loading={resending}
      />
      <Button title="Wrong email? Go back" variant="text" onPress={() => router.back()} />
    </Screen>
  );
}

const makeStyles = (c: Palette) =>
  StyleSheet.create({
    lead: { ...type.body, color: c.text, marginBottom: space.xl },
    email: { color: c.heading, fontWeight: '700' },
    notice: { ...type.label, color: c.success, marginBottom: space.lg },
    code: { fontFamily: fonts.display, fontSize: 26, letterSpacing: 10, textAlign: 'center' },
  });
