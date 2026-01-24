# OTP Provider Architecture - Abstraction Design

**Status:** Design Document  
**Created:** 2026-01-24  
**Purpose:** Define strict abstraction requirements for multi-provider OTP system

---

## 🎯 CRITICAL DESIGN PRINCIPLES

When implementing the OTP system, you MUST follow these requirements:

### **1. OtpProvider Interface (MANDATORY)**

A strict interface must exist that defines the contract for ALL OTP providers:

```typescript
interface OtpProvider {
  // Send OTP to phone number
  sendOtp(phone: string, code: string): Promise<OtpResult>;
  
  // Verify OTP (if provider supports verification)
  verifyOtp?(phone: string, code: string): Promise<boolean>;
  
  // Get provider name/type
  getName(): OtpProviderType;
}
```

**Rules:**
- ✅ ALL providers must implement this exact interface
- ✅ No provider-specific methods exposed outside the provider
- ✅ Interface must be in a shared location (e.g., `auth/providers/interfaces/`)

---

### **2. AuthService Abstraction (MANDATORY)**

The `AuthService` must depend ONLY on the `OtpProvider` interface:

```typescript
@Injectable()
export class AuthService {
  constructor(
    private otpProviderRegistry: OtpProviderRegistry, // Factory/Registry pattern
    private otpService: OtpService, // OTP generation/storage
    private jwtService: JwtService, // JWT generation
  ) {}
  
  // Service methods use ONLY the interface
  async requestOtp(dto: RequestOtpDto): Promise<RequestOtpResponse> {
    const provider = this.otpProviderRegistry.getProvider();
    const code = await this.otpService.generateOtp(dto.phone, dto.role);
    await provider.sendOtp(dto.phone, code);
    // ...
  }
}
```

**Rules:**
- ❌ AuthService MUST NOT import any concrete provider classes
- ❌ AuthService MUST NOT have provider-specific logic
- ❌ AuthService MUST NOT check provider names with if/else
- ✅ AuthService uses ONLY the OtpProvider interface
- ✅ All provider selection happens via registry/factory

---

### **3. Provider Registry/Factory Pattern (MANDATORY)**

Providers must be registered via a factory or registry pattern:

```typescript
@Injectable()
export class OtpProviderRegistry {
  private provider: OtpProvider;
  
  register(provider: OtpProvider): void {
    this.provider = provider;
  }
  
  getProvider(): OtpProvider {
    if (!this.provider) {
      throw new Error('OTP provider not configured');
    }
    return this.provider;
  }
}
```

**Rules:**
- ✅ Provider registered at module initialization
- ✅ Provider selection via environment variable or config
- ✅ Adding new provider = add to registry only
- ✅ No changes to AuthService when adding providers

---

### **4. No Provider-Specific Fields in Core Entities (MANDATORY)**

**Otp Entity:**
- ✅ `code: string` (generic OTP code)
- ✅ `phone: string` (phone number)
- ✅ `provider: OtpProviderType` (enum: TWILIO, AWS_SNS, etc.)
- ❌ NO `twilioMessageId`, `awsSnsMessageId`, etc.
- ❌ NO provider-specific JSON fields

**Rules:**
- ✅ Core entities remain provider-agnostic
- ✅ Provider-specific data stored in `metadata` JSON (if needed)
- ✅ Business logic never queries `metadata` fields
- ✅ Adding new provider = no schema changes

---

### **5. Implementation Structure (RECOMMENDED)**

```
auth/
├── auth.module.ts
├── auth.service.ts          # Uses ONLY OtpProvider interface
├── auth.controller.ts
├── interfaces/
│   └── otp-provider.interface.ts  # OtpProvider interface
├── registry/
│   └── otp-provider.registry.ts    # Factory/Registry
├── providers/
│   ├── twilio/
│   │   ├── twilio.provider.ts           # Implements OtpProvider
│   │   └── twilio.types.ts              # Twilio-specific types
│   └── base/
│       └── otp-provider.base.ts   # Optional base class
├── services/
│   ├── otp.service.ts              # OTP generation/storage
│   └── jwt.service.ts               # JWT token generation
└── dto/
    ├── request-otp.dto.ts
    └── verify-otp.dto.ts
```

---

## 🚫 ANTI-PATTERNS (DO NOT DO)

### ❌ **Provider-Specific Logic in AuthService**
```typescript
// BAD: Provider-specific checks
if (provider === 'twilio') {
  return await this.twilioClient.sendSms(...);
} else if (provider === 'aws-sns') {
  return await this.snsClient.publish(...);
}
```

### ❌ **Direct Provider Imports in AuthService**
```typescript
// BAD: Concrete provider imports
import { TwilioProvider } from './providers/twilio/twilio.provider';
import { AwsSnsProvider } from './providers/aws-sns/aws-sns.provider';
```

### ❌ **Provider-Specific Fields in Otp Entity**
```prisma
// BAD: Provider-specific columns
model Otp {
  twilioMessageId String?
  awsSnsMessageId String?
  // ...
}
```

### ❌ **Hardcoded Provider Names**
```typescript
// BAD: String literals
const provider = 'twilio'; // Hardcoded
```

---

## ✅ CORRECT PATTERNS

### ✅ **Interface-Based Design**
```typescript
// GOOD: Service depends on interface
constructor(private otpProviderRegistry: OtpProviderRegistry) {}

async requestOtp(dto: RequestOtpDto) {
  const provider = this.otpProviderRegistry.getProvider();
  return await provider.sendOtp(dto.phone, code);
}
```

### ✅ **Enum-Based Provider Selection**
```typescript
// GOOD: Type-safe provider enum
enum OtpProviderType {
  TWILIO = 'TWILIO',
  AWS_SNS = 'AWS_SNS',
  // Adding new provider = add enum value only
}
```

### ✅ **Provider-Specific Logic Isolated**
```typescript
// GOOD: Provider-specific code stays in provider
@Injectable()
export class TwilioProvider implements OtpProvider {
  async sendOtp(...): Promise<OtpResult> {
    // Twilio-specific API calls here
    // No impact on AuthService
  }
}
```

---

## 📋 IMPLEMENTATION CHECKLIST

When implementing the OTP system, verify:

- [ ] `OtpProvider` interface exists with all required methods
- [ ] `AuthService` imports ONLY the interface (no concrete providers)
- [ ] Provider registry/factory pattern implemented
- [ ] All providers implement `OtpProvider` interface
- [ ] No provider-specific fields in `Otp` entity
- [ ] Provider selection uses enum, not string literals
- [ ] Adding a new provider requires:
  - [ ] Create provider class implementing interface
  - [ ] Register in module
  - [ ] Add enum value
  - [ ] NO changes to AuthService
  - [ ] NO changes to Otp entity
  - [ ] NO changes to OTP generation logic

---

## 🎯 GOAL

**The OTP system must remain stable and unchanged when new providers are added.**

This means:
- ✅ New provider = new provider class + registration
- ✅ Zero changes to core OTP orchestration
- ✅ Zero changes to auth/JWT logic
- ✅ Zero database migrations
- ✅ Zero breaking changes

---

## 📝 NOTES FOR FUTURE CONTRIBUTORS

**If you're adding a new OTP provider:**

1. Create provider class in `providers/{provider-name}/`
2. Implement `OtpProvider` interface
3. Register provider in `auth.module.ts`
4. Add provider type to `OtpProviderType` enum
5. **DO NOT** modify `AuthService`
6. **DO NOT** add provider-specific fields to entities
7. **DO NOT** add provider-specific logic outside the provider class

**If you're modifying OTP orchestration:**

1. Work ONLY with `OtpProvider` interface
2. Do NOT check provider names
3. Do NOT add provider-specific conditionals
4. If you need provider-specific behavior, extend the interface (carefully)

---

**Last Updated:** 2026-01-24  
**Status:** Design Document - Ready for Implementation
