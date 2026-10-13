import { Tabs } from 'expo-router';
import type { ColorValue } from 'react-native';
import { Icon, type IconName } from '../../../components/ui';
import { fonts, usePalette } from '../../../lib/theme';

const icon = (name: IconName) =>
  function TabIcon({ color, size }: { color: ColorValue; size: number }) {
    return <Icon name={name} size={size} color={color} />;
  };

export default function TabsLayout() {
  const c = usePalette();
  return (
    <Tabs
      screenOptions={{
        headerStyle: { backgroundColor: c.header },
        headerTintColor: c.onHeader,
        headerTitleStyle: { fontFamily: fonts.display },
        headerShadowVisible: false,
        sceneStyle: { backgroundColor: c.ground },
        tabBarActiveTintColor: c.link,
        tabBarInactiveTintColor: c.muted,
        tabBarStyle: { backgroundColor: c.surface, borderTopColor: c.line },
        tabBarLabelStyle: { fontSize: 12, fontWeight: '600' },
      }}
    >
      <Tabs.Screen name="index" options={{ title: 'Home', tabBarIcon: icon('home-variant-outline') }} />
      <Tabs.Screen name="requests" options={{ title: 'My requests', tabBarLabel: 'Requests', tabBarIcon: icon('ticket-confirmation-outline') }} />
      <Tabs.Screen name="account" options={{ title: 'Account', tabBarIcon: icon('account-circle-outline') }} />
    </Tabs>
  );
}
