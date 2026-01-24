# OTP Providers Directory

This directory contains implementations of OTP (One-Time Password) providers.

## ⚠️ CRITICAL: Read Architecture Requirements First

**Before implementing any provider, read:**
- `../OTP_ARCHITECTURE.md` - Complete design requirements

## Structure

Each provider must:
1. Implement the `OtpProvider` interface
2. Be registered in `auth.module.ts`
3. Keep all provider-specific logic isolated
4. NOT leak provider-specific fields into core entities

## Adding a New Provider

1. Create directory: `providers/{provider-name}/`
2. Create provider class implementing `OtpProvider` interface
3. Register in `auth.module.ts`
4. Add enum value to `OtpProviderType`
5. **DO NOT** modify `AuthService` or core entities

See `../OTP_ARCHITECTURE.md` for detailed requirements.

## Current Providers

- **Twilio** (`twilio/`) - SMS-based OTP via Twilio API
