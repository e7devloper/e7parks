import { useRouter } from 'expo-router';
import { useRef, useState } from 'react';
import { Image, StyleSheet, Text, View, type TextInput } from 'react-native';
import { Button, ErrorText, Field, Screen } from '../../components/ui';
import { ApiError, errorMessage, request } from '../../lib/api';
import { useAuth, type User } from '../../lib/auth';
import { radius, space, type, useStyles, type Palette } from '../../lib/theme';

export default function Login() {
  const router = useRouter();
  const { signIn } = useAuth();
  const styles = useStyles(makeStyles);
  const passwordRef = useRef<TextInput>(null);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit() {
    if (!email.trim() || !password) return setError('Enter your email and password.');
    setError(null);
    setBusy(true);
    try {
      await signIn(await request<{ token: string; user: User }>('/auth/login', { method: 'POST', body: { email, password } }));
    } catch (e) {
      if (e instanceof ApiError && e.code === 'EMAIL_NOT_VERIFIED') {
        router.push({ pathname: '/verify', params: { email: email.trim().toLowerCase() } });
      } else {
        setError(errorMessage(e));
      }
    } finally {
      setBusy(false);
    }
  }

  return (
    <Screen padTop>
      <View style={styles.brand}>
        {/* The logo artwork has a white ground, so it always sits on a white tile. */}
        <View style={styles.logoTile}>
          <Image source={require('../../../assets/logo.png')} style={styles.logo} resizeMode="contain" accessibilityLabel="E7 Entertainments" />
        </View>
        <Text accessibilityRole="header" style={styles.title}>
          Let's build your park
        </Text>
        <Text style={styles.subtitle}>
          Tell E7 Entertainments what you have in mind. We'll come back with a plan and a quote.
        </Text>
      </View>
      <ErrorText>{error}</ErrorText>
      <Field
        label="Email"
        value={email}
        onChangeText={setEmail}
        placeholder="you@example.com"
        keyboardType="email-address"
        autoCapitalize="none"
        autoCorrect={false}
        autoComplete="email"
        textContentType="username"
        returnKeyType="next"
        submitBehavior="submit"
        onSubmitEditing={() => passwordRef.current?.focus()}
      />
      <Field
        ref={passwordRef}
        label="Password"
        value={password}
        onChangeText={setPassword}
        placeholder="Your password"
        secureTextEntry
        autoComplete="current-password"
        textContentType="password"
        returnKeyType="go"
        onSubmitEditing={submit}
      />
      <Button title="Log in" onPress={submit} loading={busy} />
      <View style={styles.gap} />
      <Button title="New here? Create an account" variant="text" onPress={() => router.push('/register')} />
    </Screen>
  );
}

const makeStyles = (c: Palette) =>
  StyleSheet.create({
    brand: { marginBottom: space.xxl },
    logoTile: {
      width: 104,
      height: 104,
      borderRadius: radius.lg + 8,
      backgroundColor: '#FFFFFF',
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: space.xl,
      shadowColor: c.shadow,
      shadowOpacity: 0.12,
      shadowRadius: 16,
      shadowOffset: { width: 0, height: 6 },
      elevation: 4,
    },
    logo: { width: 84, height: 84 },
    title: { ...type.display, color: c.heading },
    subtitle: { ...type.body, color: c.muted, marginTop: space.sm },
    gap: { height: space.sm },
  });
