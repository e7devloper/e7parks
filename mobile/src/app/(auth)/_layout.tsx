import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { fonts, usePalette } from '../../lib/theme';

export default function AuthLayout() {
  const c = usePalette();
  return (
    <>
      <StatusBar style="auto" />
      <Stack
        screenOptions={{
          headerShadowVisible: false,
          headerStyle: { backgroundColor: c.ground },
          headerTintColor: c.heading,
          headerTitleStyle: { fontFamily: fonts.display },
          headerBackButtonDisplayMode: 'minimal',
          contentStyle: { backgroundColor: c.ground },
        }}
      >
        <Stack.Screen name="login" options={{ headerShown: false }} />
        <Stack.Screen name="register" options={{ title: 'Create account' }} />
        <Stack.Screen name="verify" options={{ title: 'Verify email' }} />
      </Stack>
    </>
  );
}
