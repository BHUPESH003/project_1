# Delivery Module - Architecture Design Requirements

**Status:** Design Document (Not Yet Implemented)  
**Created:** 2026-01-24  
**Purpose:** Define strict abstraction requirements for multi-provider delivery system

---

## 🎯 CRITICAL DESIGN PRINCIPLES

When implementing the Delivery module, you MUST follow these requirements:

### **1. DeliveryProvider Interface (MANDATORY)**

A strict interface must exist that defines the contract for ALL delivery aggregators:

```typescript
interface DeliveryProvider {
  // Get delivery quote for an order
  getQuote(order: Order, pickup: Location, delivery: Location): Promise<DeliveryQuote>;
  
  // Create a delivery task
  createTask(order: Order, quote: DeliveryQuote): Promise<DeliveryTask>;
  
  // Cancel an existing delivery task
  cancelTask(taskId: string): Promise<void>;
  
  // Get current status of a delivery task
  getStatus(taskId: string): Promise<DeliveryStatus>;
}
```

**Rules:**
- ✅ ALL aggregators must implement this exact interface
- ✅ No aggregator-specific methods exposed outside the provider
- ✅ Interface must be in a shared location (e.g., `delivery/interfaces/`)

---

### **2. DeliveryService Abstraction (MANDATORY)**

The `DeliveryService` must depend ONLY on the `DeliveryProvider` interface:

```typescript
@Injectable()
export class DeliveryService {
  constructor(
    private providerRegistry: DeliveryProviderRegistry, // Factory/Registry pattern
  ) {}
  
  // Service methods use ONLY the interface
  async assignDelivery(order: Order): Promise<DeliveryAssignment> {
    const provider = this.providerRegistry.getProvider(order.deliveryProvider);
    const quote = await provider.getQuote(...);
    // ...
  }
}
```

**Rules:**
- ❌ DeliveryService MUST NOT import any concrete provider classes
- ❌ DeliveryService MUST NOT have provider-specific logic
- ❌ DeliveryService MUST NOT check provider names with if/else
- ✅ DeliveryService uses ONLY the DeliveryProvider interface
- ✅ All provider selection happens via registry/factory

---

### **3. Provider Registry/Factory Pattern (MANDATORY)**

Providers must be registered via a factory or registry pattern:

```typescript
@Injectable()
export class DeliveryProviderRegistry {
  private providers = new Map<DeliveryProviderType, DeliveryProvider>();
  
  register(type: DeliveryProviderType, provider: DeliveryProvider): void {
    this.providers.set(type, provider);
  }
  
  getProvider(type: DeliveryProviderType): DeliveryProvider {
    const provider = this.providers.get(type);
    if (!provider) {
      throw new Error(`Provider ${type} not found`);
    }
    return provider;
  }
}
```

**Rules:**
- ✅ Providers registered at module initialization
- ✅ Provider selection via enum/type, not string matching
- ✅ Adding new provider = add to registry only
- ✅ No changes to DeliveryService when adding providers

---

### **4. No Provider-Specific Fields in Core Entities (MANDATORY)**

**Order Entity:**
- ✅ `deliveryProvider: DeliveryProviderType` (enum: DUNZO, PORTER, etc.)
- ✅ `deliveryTrackingId: string` (generic tracking ID)
- ❌ NO `dunzoTaskId`, `porterOrderId`, etc.
- ❌ NO provider-specific JSON fields

**Delivery Entity:**
- ✅ `provider: DeliveryProviderType`
- ✅ `trackingId: string`
- ✅ `status: DeliveryStatus` (unified status enum)
- ✅ `metadata: Json` (for provider-specific data, but NOT queried)
- ❌ NO provider-specific columns

**Rules:**
- ✅ Core entities remain provider-agnostic
- ✅ Provider-specific data stored in `metadata` JSON (if needed)
- ✅ Business logic never queries `metadata` fields
- ✅ Adding new provider = no schema changes

---

### **5. Implementation Structure (RECOMMENDED)**

```
delivery/
├── delivery.module.ts
├── delivery.service.ts          # Uses ONLY DeliveryProvider interface
├── delivery.controller.ts
├── interfaces/
│   └── delivery-provider.interface.ts  # DeliveryProvider interface
├── registry/
│   └── delivery-provider.registry.ts    # Factory/Registry
├── providers/
│   ├── dunzo/
│   │   ├── dunzo.provider.ts           # Implements DeliveryProvider
│   │   └── dunzo.types.ts              # Dunzo-specific types
│   ├── porter/
│   │   ├── porter.provider.ts          # Implements DeliveryProvider
│   │   └── porter.types.ts             # Porter-specific types
│   └── base/
│       └── delivery-provider.base.ts   # Optional base class
└── types/
    └── delivery.types.ts               # Shared types (DeliveryStatus, etc.)
```

---

## 🚫 ANTI-PATTERNS (DO NOT DO)

### ❌ **Provider-Specific Logic in DeliveryService**
```typescript
// BAD: Provider-specific checks
if (provider === 'dunzo') {
  return await this.dunzoClient.createTask(...);
} else if (provider === 'porter') {
  return await this.porterClient.createOrder(...);
}
```

### ❌ **Direct Provider Imports in DeliveryService**
```typescript
// BAD: Concrete provider imports
import { DunzoProvider } from './providers/dunzo/dunzo.provider';
import { PorterProvider } from './providers/porter/porter.provider';
```

### ❌ **Provider-Specific Fields in Order/Delivery**
```prisma
// BAD: Provider-specific columns
model Delivery {
  dunzoTaskId String?
  porterOrderId String?
  // ...
}
```

### ❌ **Hardcoded Provider Names**
```typescript
// BAD: String literals
const provider = 'dunzo'; // Hardcoded
```

---

## ✅ CORRECT PATTERNS

### ✅ **Interface-Based Design**
```typescript
// GOOD: Service depends on interface
constructor(private providerRegistry: DeliveryProviderRegistry) {}

async assignDelivery(order: Order) {
  const provider = this.providerRegistry.getProvider(order.deliveryProvider);
  return await provider.createTask(...);
}
```

### ✅ **Enum-Based Provider Selection**
```typescript
// GOOD: Type-safe provider enum
enum DeliveryProviderType {
  DUNZO = 'DUNZO',
  PORTER = 'PORTER',
  // Adding new provider = add enum value only
}
```

### ✅ **Provider-Specific Logic Isolated**
```typescript
// GOOD: Provider-specific code stays in provider
@Injectable()
export class DunzoProvider implements DeliveryProvider {
  async createTask(...): Promise<DeliveryTask> {
    // Dunzo-specific API calls here
    // No impact on DeliveryService
  }
}
```

---

## 📋 IMPLEMENTATION CHECKLIST

When implementing the Delivery module, verify:

- [ ] `DeliveryProvider` interface exists with all required methods
- [ ] `DeliveryService` imports ONLY the interface (no concrete providers)
- [ ] Provider registry/factory pattern implemented
- [ ] All providers implement `DeliveryProvider` interface
- [ ] No provider-specific fields in `Order` or `Delivery` entities
- [ ] Provider selection uses enum, not string literals
- [ ] Adding a new provider requires:
  - [ ] Create provider class implementing interface
  - [ ] Register in module
  - [ ] Add enum value
  - [ ] NO changes to DeliveryService
  - [ ] NO changes to Order/Delivery entities
  - [ ] NO changes to order/payment logic

---

## 🎯 GOAL

**The delivery system must remain stable and unchanged when new aggregators are added.**

This means:
- ✅ New provider = new provider class + registration
- ✅ Zero changes to core delivery orchestration
- ✅ Zero changes to order/payment modules
- ✅ Zero database migrations
- ✅ Zero breaking changes

---

## 📝 NOTES FOR FUTURE CONTRIBUTORS

**If you're adding a new delivery provider:**

1. Create provider class in `providers/{provider-name}/`
2. Implement `DeliveryProvider` interface
3. Register provider in `delivery.module.ts`
4. Add provider type to `DeliveryProviderType` enum
5. **DO NOT** modify `DeliveryService`
6. **DO NOT** add provider-specific fields to entities
7. **DO NOT** add provider-specific logic outside the provider class

**If you're modifying delivery orchestration:**

1. Work ONLY with `DeliveryProvider` interface
2. Do NOT check provider names
3. Do NOT add provider-specific conditionals
4. If you need provider-specific behavior, extend the interface (carefully)

---

**Last Updated:** 2026-01-24  
**Status:** Design Document - Awaiting Implementation
