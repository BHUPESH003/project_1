/**
 * Environment configuration
 * Uses EXPO_PUBLIC_* prefix for client-side vars
 */

export const ENV = {
  API_BASE_URL: process.env.EXPO_PUBLIC_API_BASE_URL || 'http://localhost:3000/api',
  ENV: process.env.EXPO_PUBLIC_ENV || 'development',
};

export const isDevelopment = ENV.ENV === 'development';
export const isProduction = ENV.ENV === 'production';

// Firebase Configuration (optional - configure if FCM is enabled)
export const FIREBASE_CONFIG = {
  projectId: process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID || '',
  appId: process.env.EXPO_PUBLIC_FIREBASE_APP_ID || '',
};

// Feature flags
export const DEBUG = process.env.EXPO_PUBLIC_DEBUG === 'true';
