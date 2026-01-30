# ⚡ Quick Start

## Setup (5 minutes)

```bash
# 1. Configure environment
cp .env.example .env

# 2. Edit .env - set your backend URL
nano .env
# Change EXPO_PUBLIC_API_BASE_URL to your backend

# 3. Install dependencies (if needed)
npm install --legacy-peer-deps

# 4. Start dev server
npm start
```

## Run App

```bash
# iPhone Simulator
npm run ios

# Android Emulator
npm run android

# Web Browser
npm run web

# Or from Expo Go:
# Scan QR code after npm start
```

## Verify Everything Works

```bash
# Check TypeScript
npx tsc --noEmit

# Should output nothing if successful
```

## What's Working

✅ **Auth Foundation**
- Phone login screen at `/(auth)/login`
- OTP verification at `/(auth)/verify-otp`
- Tokens persisted to AsyncStorage
- Auto-redirect based on auth state

✅ **Navigation**
- Auth guard redirects to login if not authenticated
- Tab navigation with Home, Orders, Profile
- Dynamic order detail route: `/order/123`

✅ **API Layer**
- Axios client with auto-token injection
- Token refresh on 401 errors
- Separate API modules for each domain
- No API calls in screens

✅ **State Management**
- Zustand for auth + user state
- React Query for server data
- AsyncStorage persistence

✅ **Push Notifications**
- Device token registration ready
- Notification handler configured
- Hook to get token

## Project Structure

```
app/                    ← Expo Router routes
src/
  api/                  ← API endpoints
  store/                ← Zustand stores
  hooks/                ← Custom hooks
  components/           ← Reusable UI
  constants/            ← Config
  utils/                ← Helpers
```

## Key Files to Understand

| File | Purpose |
| --- | --- |
| `app/index.tsx` | Auth guard - redirects based on login state |
| `src/api/client.ts` | Axios with token injection & refresh logic |
| `src/store/auth.store.ts` | Auth state + token persistence |
| `src/hooks/useAuth.ts` | Use this in components |
| `src/constants/env.ts` | All config from environment |

## Next: Build a Feature

**Example: Load categories on Home screen**

1. Use `useQuery()` to call `sellersApi.getCategories()`
2. Display list on `app/(tabs)/home.tsx`
3. No changes to auth or API layer needed

See `SCAFFOLD_README.md` for detailed examples.

## Troubleshooting

**Module not found `@/...`**
- Restart dev server after adding imports
- Check path aliases in `tsconfig.json`

**Token not persisting**
- Verify `AsyncStorage` is not cleared
- Check browser storage/app cache

**API calls failing with 401**
- Token refresh logic runs automatically
- If still failing, check backend is running
- See `src/api/client.ts` for retry logic

---

## Ready! 🚀

Everything is scaffolded. Start developing features with confidence—no refactoring needed.
