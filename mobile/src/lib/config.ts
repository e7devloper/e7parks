import Constants from 'expo-constants';

// In Expo Go the Metro host is the computer running the server, so reuse its LAN address.
// Set EXPO_PUBLIC_API_URL to point at a deployed server (or when using `expo start --tunnel`).
const devHost = Constants.expoConfig?.hostUri?.split(':')[0];
const base = process.env.EXPO_PUBLIC_API_URL ?? `http://${devHost ?? 'localhost'}:4000`;

const site = base.replace(/\/+$/, '');

export const API_URL = `${site}/api`;
/** Served by the same server; also the URL given to the App Store and Google Play listings. */
export const PRIVACY_URL = `${site}/privacy`;
