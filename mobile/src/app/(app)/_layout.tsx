import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { fonts, usePalette } from '../../lib/theme';

export default function AppLayout() {
  const c = usePalette();
  return (
    <>
      {/* The header is navy in both appearances, so the status bar is always light. */}
      <StatusBar style="light" />
      <Stack
        screenOptions={{
          headerStyle: { backgroundColor: c.header },
          headerTintColor: c.onHeader,
          headerTitleStyle: { fontFamily: fonts.display },
          headerShadowVisible: false,
          headerBackButtonDisplayMode: 'minimal',
          contentStyle: { backgroundColor: c.ground },
        }}
      >
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="new-request" options={{ title: 'New request' }} />
        <Stack.Screen name="delete-account" options={{ title: 'Delete account' }} />
        <Stack.Screen name="submitted" options={{ title: 'Request sent', headerBackVisible: false, gestureEnabled: false }} />
      </Stack>
    </>
  );
}
