# User App - Expo Consumer Application

A production-grade Expo React Native app for the consumer-facing buyer application. Clean scaffolding with no business logic in screens, ready for feature development.

## Stack

- **React Native** with Expo (latest stable v54)
- **TypeScript** for type safety
- **Expo Router** for navigation
- **Zustand** for state management (auth + user)
- **TanStack Query** for server-side data caching
- **Axios** for HTTP requests with auth interceptors
- **Firebase** for push notifications
- **AsyncStorage** for token persistence

## Project Structure

```
/app
  /(auth)/
    login.tsx                # Phone number input
    verify-otp.tsx           # OTP verification
  /(tabs)/
    home.tsx                 # Home/categories
    orders.tsx               # Orders list
    profile.tsx              # User profile
  /order
    [id].tsx                 # Order detail (dynamic route)
  _layout.tsx                # Root layout with QueryClient
  _app.tsx                   # SafeAreaProvider
  index.tsx                  # Auth guard redirect

/src
  /api
    client.ts                # Axios instance with auth interceptor
    auth.api.ts              # Auth endpoints (login, verify, refresh)
    orders.api.ts            # Orders endpoints
    sellers.api.ts           # Categories/sellers endpoints
    notifications.api.ts     # Push notification endpoints
  
  /store
    auth.store.ts            # Zustand: auth state + actions
    user.store.ts            # Zustand: user profile state
  
  /hooks
    useAuth.ts               # Auth hook wrapping store
    usePushNotifications.ts  # Push notifications setup
  
  /components
    Button.tsx               # Base button (no styling polish)
    Loader.tsx               # Loading spinner
  
  /constants
    env.ts                   # Environment config
  
  /utils
    format.ts                # Phone, currency, date, error formatting

.env.example                 # Environment variable template
babel.config.js              # Path aliases via module-resolver
tsconfig.json                # TypeScript with path alias config
```

## Getting Started

### Setup

1. Copy `.env.example` to `.env` and configure:
   ```bash
   cp .env.example .env
   ```

2. Set `EXPO_PUBLIC_API_BASE_URL` to your backend URL (default: `http://localhost:3000/api`)

3. Install dependencies (already done, but if needed):
   ```bash
   npm install --legacy-peer-deps
   ```

### Development

Start the Expo dev server:

```bash
npm start
```

Run on specific platform:

```bash
npm run ios       # iOS simulator
npm run android   # Android emulator
npm run web       # Web browser
```

### TypeScript

Check for type errors:

```bash
npx tsc --noEmit
```

## Auth Flow

1. User enters phone number → `login()` API call
2. Backend sends OTP via SMS
3. User enters OTP → `verifyOtp()` API call
4. Token + refreshToken stored in AsyncStorage
5. Zustand store updated
6. Navigation redirects to `/(tabs)/home`

## API Layer

All API calls go through `/src/api/` modules. **No direct API calls in screens.**

### Axios Interceptors

- **Request:** Attaches Bearer token from AsyncStorage
- **Response:** 
  - Catches 401 errors
  - Attempts token refresh
  - Retries request if refresh succeeds
  - Clears tokens if refresh fails

### Adding New Endpoints

Create a new file in `/src/api/`:

```typescript
export const exampleApi = {
  async getExample(): Promise<any> {
    const { data } = await client.get('/example');
    return data;
  },
};
```

Use in component via TanStack Query:

```typescript
const { data } = useQuery({
  queryKey: ['example'],
  queryFn: () => exampleApi.getExample(),
});
```

## State Management

### Auth Store (`useAuthStore`)

- **State:** token, refreshToken, user, isLoading, error
- **Actions:** login, verifyOtp, logout, setToken, restoreToken
- **Persistence:** AsyncStorage (`auth-store` key)

Use via `useAuth()` hook:

```typescript
const { user, isAuthenticated, logout } = useAuth();
```

### User Store (`useUserStore`)

- **State:** profile, isLoading, error
- **Actions:** setProfile, updateProfile, reset
- **Persistence:** AsyncStorage (`user-store` key)

## Push Notifications

`usePushNotifications()` hook:
- Gets Expo Push Token from device
- Sends token to backend (`/notifications/register`)
- Does NOT request permissions (use UI flow when needed)

```typescript
const { expoPushToken, error } = usePushNotifications();
```

## Environment Variables

Set these in `.env`:

| Variable | Default | Description |
| --- | --- | --- |
| `EXPO_PUBLIC_API_BASE_URL` | `http://localhost:3000/api` | Backend API URL |
| `EXPO_PUBLIC_ENV` | `development` | Environment (development/production) |
| `EXPO_PUBLIC_DEBUG` | `false` | Enable debug logging |
| `EXPO_PUBLIC_FIREBASE_PROJECT_ID` | `` | Firebase project ID (optional) |
| `EXPO_PUBLIC_FIREBASE_APP_ID` | `` | Firebase app ID (optional) |

## TODO / Future Work

- [ ] Request push notification permissions in UI
- [ ] Implement token refresh retry logic with backoff
- [ ] Add UI styling (no business logic changes needed)
- [ ] Add form validation (phone, OTP)
- [ ] Implement categories listing
- [ ] Implement order creation flow
- [ ] Add error boundaries
- [ ] Setup error logging (Sentry, etc.)
- [ ] Add analytics
- [ ] Implement deep linking for order notifications

## Key Constraints Met

✅ No business logic in screens  
✅ No direct API calls inside components  
✅ No mock data  
✅ No seller/admin features  
✅ No styling polish  
✅ All TypeScript—passes strict mode  
✅ Auth flow foundation with OTP  
✅ Push notifications ready  
✅ Zustand + React Query integrated  
✅ Token refresh on 401  

## Running Checks

```bash
# TypeScript
npx tsc --noEmit

# Lint (if configured)
npm run lint
```

## Notes

- Path aliases use `@/` for `/src` imports
- Tokens are persisted to AsyncStorage with keys: `authToken`, `refreshToken`
- All environment variables must be prefixed with `EXPO_PUBLIC_` to be exposed to the app
- Firebase FCM credentials should be configured when implementing notification permissions UI
