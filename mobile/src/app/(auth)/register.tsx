import { useRouter } from 'expo-router';
import { useRef, useState } from 'react';
import { Linking, StyleSheet, Text, type TextInput } from 'react-native';
import { Button, ErrorText, Field, Screen } from '../../components/ui';
import { errorMessage, request } from '../../lib/api';
import { PRIVACY_URL } from '../../lib/config';
import { space, type, useStyles, type Palette } from '../../lib/theme';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const PHONE_RE = /^\+?[0-9][0-9\s-]{6,17}$/;

type Errors = Partial<Record<'name' | 'email' | 'phone' | 'password', string>>;

export default function Register() {
  const router = useRouter();
  const styles = useStyles(makeStyles);
  const emailRef = useRef<TextInput>(null);
  const phoneRef = useRef<TextInput>(null);
  const passwordRef = useRef<TextInput>(null);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [errors, setErrors] = useState<Errors>({});
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit() {
    const found: Errors = {};
    if (name.trim().length < 2) found.name = 'Enter your full name.';
    if (!EMAIL_RE.test(email.trim())) found.email = 'Enter a valid email address.';
    if (!PHONE_RE.test(phone.trim())) found.phone = 'Enter a valid phone number, including country code.';
    if (password.length < 8) found.password = 'Use at least 8 characters.';
    setErrors(found);
    setError(null);
    if (Object.keys(found).length) return;

    setBusy(true);
    try {
      const res = await request<{ email: string }>('/auth/register', { method: 'POST', body: { name, email, phone, password } });
      router.push({ pathname: '/verify', params: { email: res.email } });
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setBusy(false);
    }
  }

  return (
    <Screen>
      <ErrorText>{error}</ErrorText>
      <Field
        label="Full name"
        value={name}
        onChangeText={setName}
        error={errors.name}
        placeholder="Your name"
        autoComplete="name"
        textContentType="name"
        returnKeyType="next"
        submitBehavior="submit"
        onSubmitEditing={() => emailRef.current?.focus()}
      />
      <Field
        ref={emailRef}
        label="Email"
        value={email}
        onChangeText={setEmail}
        error={errors.email}
        placeholder="you@example.com"
        hint="We'll send a 6-digit verification code here."
        keyboardType="email-address"
        autoCapitalize="none"
        autoCorrect={false}
        autoComplete="email"
        textContentType="emailAddress"
        returnKeyType="next"
        submitBehavior="submit"
        onSubmitEditing={() => phoneRef.current?.focus()}
      />
      <Field
        ref={phoneRef}
        label="Phone"
        value={phone}
        onChangeText={setPhone}
        error={errors.phone}
        placeholder="+91 98765 43210"
        hint="So the team can call or WhatsApp you about your request."
        keyboardType="phone-pad"
        autoComplete="tel"
        textContentType="telephoneNumber"
      />
      <Field
        ref={passwordRef}
        label="Password"
        value={password}
        onChangeText={setPassword}
        error={errors.password}
        placeholder="At least 8 characters"
        secureTextEntry
        autoComplete="new-password"
        textContentType="newPassword"
        returnKeyType="go"
        onSubmitEditing={submit}
      />
      <Button title="Send verification code" onPress={submit} loading={busy} />
      <Text style={styles.footnote}>
        By creating an account you agree to our{' '}
        <Text accessibilityRole="link" style={styles.link} onPress={() => Linking.openURL(PRIVACY_URL)}>
          privacy policy
        </Text>
        .
      </Text>
    </Screen>
  );
}

const makeStyles = (c: Palette) =>
  StyleSheet.create({
    footnote: { ...type.caption, color: c.muted, textAlign: 'center', marginTop: space.lg },
    link: { color: c.link, fontWeight: '600', textDecorationLine: 'underline' },
  });
