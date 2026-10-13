import { Montserrat_600SemiBold, Montserrat_700Bold, useFonts } from '@expo-google-fonts/montserrat';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect } from 'react';
import { AuthProvider, useAuth } from '../lib/auth';

SplashScreen.preventAutoHideAsync().catch(() => {});

function RootNavigator({ fontsReady }: { fontsReady: boolean }) {
  const { user, loading } = useAuth();
  const ready = fontsReady && !loading;

  // The splash stays up until the session and the brand font are both known, so nothing flashes.
  useEffect(() => {
    if (ready) SplashScreen.hideAsync().catch(() => {});
  }, [ready]);

  if (!ready) return null;
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Protected guard={!!user}>
        <Stack.Screen name="(app)" />
      </Stack.Protected>
      <Stack.Protected guard={!user}>
        <Stack.Screen name="(auth)" />
      </Stack.Protected>
    </Stack>
  );
}

export default function RootLayout() {
  const [loaded, error] = useFonts({ Montserrat_600SemiBold, Montserrat_700Bold });
  return (
    <AuthProvider>
      {/* If the font fails to load the app still opens, on the system font. */}
      <RootNavigator fontsReady={loaded || !!error} />
    </AuthProvider>
  );
}
