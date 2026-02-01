/**
 * Environment configuration
 * Uses EXPO_PUBLIC_* prefix for client-side vars
 *
 * API_BASE_URL:
 * - Web / iOS simulator: localhost works.
 * - Android emulator: client.ts maps localhost → 10.0.2.2 automatically.
 * - Physical device (Expo Go): set EXPO_PUBLIC_API_BASE_URL to your computer's LAN IP,
 *   e.g. http://192.168.1.5:3000/api (find IP with: ip addr | grep "inet " on Linux/Mac).
 */

export const ENV = {
  API_BASE_URL: process.env.EXPO_PUBLIC_API_BASE_URL || 'http://localhost:3000/api',
  ENV: process.env.EXPO_PUBLIC_ENV || 'development',
};

export const isDevelopment = ENV.ENV === 'development';
export const isProduction = ENV.ENV === 'production';

// Optional: add firebase when you need FCM; avoid including it for web (import.meta breaks web bundle).
export const FIREBASE_CONFIG = {
  projectId: process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID || '',
  appId: process.env.EXPO_PUBLIC_FIREBASE_APP_ID || '',
};

// Feature flags
export const DEBUG = process.env.EXPO_PUBLIC_DEBUG === 'true';
