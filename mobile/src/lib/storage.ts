import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

// SecureStore is native-only; the browser build falls back to localStorage.
const web = Platform.OS === 'web';

export async function getItem(key: string) {
  return web ? globalThis.localStorage?.getItem(key) ?? null : SecureStore.getItemAsync(key);
}

export async function setItem(key: string, value: string) {
  if (web) globalThis.localStorage?.setItem(key, value);
  else await SecureStore.setItemAsync(key, value);
}

export async function removeItem(key: string) {
  if (web) globalThis.localStorage?.removeItem(key);
  else await SecureStore.deleteItemAsync(key);
}
