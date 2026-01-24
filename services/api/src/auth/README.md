# Auth Module - OTP-Based Authentication

## Overview

This module implements OTP-based authentication with a fully abstracted provider system. Currently uses Twilio, but can be easily swapped to any other provider.

## Architecture

The auth system follows strict abstraction principles:

- **OtpProvider Interface**: All providers must implement this interface
- **OtpProviderRegistry**: Factory pattern for provider management
- **AuthService**: Uses only the interface, no provider-specific logic
- **Easy Provider Swapping**: Change provider in `auth.module.ts` only

See `OTP_ARCHITECTURE.md` for complete design requirements.

## Endpoints

### POST `/v1/auth/request-otp`
Request OTP to be sent to phone number.

**Request:**
```json
{
  "phone": "+919876543210",
  "role": "USER"
}
```

**Response:**
```json
{
  "message": "OTP sent successfully"
}
```

### POST `/v1/auth/verify-otp`
Verify OTP and get JWT token.

**Request:**
```json
{
  "phone": "+919876543210",
  "otp": "123456"
}
```

**Response:**
```json
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "expiresIn": 3600,
  "user": {
    "id": "clx...",
    "phone": "+919876543210",
    "role": "USER"
  }
}
```

## Configuration

### Environment Variables

```env
# Twilio Configuration
TWILIO_ACCOUNT_SID=your_account_sid
TWILIO_AUTH_TOKEN=your_auth_token
TWILIO_PHONE_NUMBER=+1234567890

# JWT Configuration
JWT_SECRET=your-secret-key-minimum-32-characters
JWT_EXPIRATION=3600s
```

## Changing OTP Provider

To switch from Twilio to another provider (e.g., AWS SNS):

1. Create new provider class:
```typescript
// providers/aws-sns/aws-sns.provider.ts
export class AwsSnsProvider implements OtpProvider {
  // Implement interface methods
}
```

2. Update `auth.module.ts`:
```typescript
// Replace TwilioProvider with AwsSnsProvider
{
  provide: AwsSnsProvider,
  useFactory: (configService: ConfigService) => {
    return new AwsSnsProvider(configService);
  },
  inject: [ConfigService],
},
```

3. Update registry registration:
```typescript
{
  provide: 'OTP_PROVIDER_REGISTRATION',
  useFactory: (registry, awsSnsProvider) => {
    registry.register(awsSnsProvider);
    return true;
  },
  inject: [OtpProviderRegistry, AwsSnsProvider],
}
```

**No changes needed in:**
- ✅ AuthService
- ✅ AuthController
- ✅ DTOs
- ✅ Database schema
- ✅ OTP service

## Files Structure

```
auth/
├── auth.module.ts              # Module configuration
├── auth.controller.ts          # REST endpoints
├── auth.service.ts             # Business logic (provider-agnostic)
├── OTP_ARCHITECTURE.md         # Design requirements
├── providers/
│   ├── interfaces/
│   │   └── otp-provider.interface.ts  # OtpProvider interface
│   ├── registry/
│   │   └── otp-provider.registry.ts   # Provider registry
│   ├── twilio/
│   │   └── twilio.provider.ts         # Twilio implementation
│   └── README.md
├── services/
│   ├── otp.service.ts         # OTP generation/storage
│   └── jwt.service.ts         # JWT token management
└── dto/
    ├── request-otp.dto.ts
    └── verify-otp.dto.ts
```
