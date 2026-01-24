# Delivery Providers Directory

This directory contains implementations of delivery aggregator providers.

## ⚠️ CRITICAL: Read Architecture Requirements First

**Before implementing any provider, read:**
- `../DELIVERY_ARCHITECTURE.md` - Complete design requirements

## Structure

Each provider must:
1. Implement the `DeliveryProvider` interface
2. Be registered in `delivery.module.ts`
3. Keep all provider-specific logic isolated
4. NOT leak provider-specific fields into core entities

## Adding a New Provider

1. Create directory: `providers/{provider-name}/`
2. Create provider class implementing `DeliveryProvider` interface
3. Register in `delivery.module.ts`
4. Add enum value to `DeliveryProviderType`
5. **DO NOT** modify `DeliveryService` or core entities

See `../DELIVERY_ARCHITECTURE.md` for detailed requirements.
