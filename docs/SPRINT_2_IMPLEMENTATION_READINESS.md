# SPRINT 2 IMPLEMENTATION READINESS CHECKLIST
## Pre-Implementation Validation

**Date:** 2026-01-24  
**Sprint:** Sprint 2 - Order Flow & State Machine  
**Status:** Ready for Implementation

---

## PART 1: DOCUMENTATION FIXES APPLIED

### ✅ PRD v1 Updates

**Changes Applied:**
- ✅ Fixed Order State Machine to: `CREATED → SELLER_SELECTED → PAID → SELLER_ACCEPTED → PREPARING → READY_FOR_PICKUP → PICKED_UP → DELIVERED`
- ✅ Added failure states: `SELLER_REJECTED`, `ORDER_EXPIRED`, `USER_CANCELLED`, `DELIVERY_FAILED`
- ✅ Clarified file upload is optional and category-dependent
- ✅ Clarified delivery is optional per order
- ✅ Clarified seller may self-deliver OR use third-party aggregators
- ✅ Added rule: Each Order maps to exactly ONE seller
- ✅ Added rule: Fallback to another seller allowed if one rejects
- ✅ Added out-of-scope items: Multi-seller checkout (future), AI-based decisions, category if/else logic

### ✅ API Contract v1 Updates

**Changes Applied:**
- ✅ Added `ORDER_EXPIRED` as valid terminal failure state
- ✅ Clarified seller actions are role-restricted (SELLER role only)
- ✅ Added rule: Each Order maps to exactly ONE seller_id
- ✅ Clarified delivery is optional per order (delivery_id may be null)
- ✅ Clarified file upload is optional and category-dependent
- ✅ Added note: Multi-seller checkout (future API v2) splits into multiple Orders

### ✅ Technical Architecture v1 Updates

**Changes Applied:**
- ✅ Added Section 16: "Category Handler Pattern (CRITICAL)"
  - OrdersService is category-agnostic
  - Category-specific logic lives in handlers
  - No if/else by category in core services
  - CategoryHandler interface definition
  - CategoryRegistry pattern
- ✅ Added Order-Seller relationship rules (one-to-one)
- ✅ Added Multi-seller checkout design (future, handled by splitting)
- ✅ Clarified delivery is optional per order
- ✅ Clarified seller may self-deliver OR use aggregators
- ✅ Added explicitly out-of-scope: AI-based decisions, category if/else, multi-seller checkout (MVP v1)

---

## PART 2: SPRINT 2 DO NOT BREAK RULES

**Document Created:** `/docs/SPRINT_2_EXECUTION_RULES.md`

**Key Rules:**
1. ✅ OrdersService MUST NOT know category details
2. ✅ Exactly ONE CategoryHandler implemented (Printing)
3. ✅ Order State Machine enforced server-side
4. ✅ Invalid state transitions throw errors
5. ✅ OrderStateHistory written on every transition
6. ✅ Timeouts DEFINED but NOT enforced yet
7. ✅ No delivery provider abstractions implemented yet
8. ✅ No payment finalization logic yet
9. ✅ Each Order has exactly one seller_id
10. ✅ File upload optional, delivery optional

---

## PART 3: IMPLEMENTATION PREP (NO CODE YET)

### ✅ CategoryHandler Interface

**File Created:** `/services/api/src/categories/handlers/category-handler.interface.ts`

**Interface Methods:**
- `getCategoryId(): string`
- `validatePayload(payload: unknown): ValidationResult`
- `calculatePrice(payload: unknown, seller: Seller): PriceBreakdown`
- `getFileRequirements(): FileRequirements | null`
- `processOrder?(orderId: string, payload: unknown): Promise<void>` (optional)

**Status:** ✅ Interface defined, ready for implementation

### ✅ PrintingCategoryHandler Outline

**File Created:** `/services/api/src/categories/handlers/printing/printing-category-handler.ts`

**Methods Defined (stubs only):**
- `validatePayload()` - TODO: Implement validation
- `calculatePrice()` - TODO: Implement pricing logic
- `getFileRequirements()` - Returns printing file requirements
- `processOrder()` - TODO: Implement if needed

**Status:** ✅ Structure defined, methods stubbed, ready for implementation

### ✅ Order State Machine Definition

**File Created:** `/services/api/src/orders/state-machine/order-state-machine.types.ts`

**Defined:**
- `ORDER_STATE_TRANSITIONS` - Complete transition matrix
- `isValidTransition()` - Validation function
- `getValidNextStates()` - Get allowed transitions
- `isTerminalState()` - Check if state is terminal
- `isFailureState()` - Check if state is failure

**State Machine:**
```
CREATED → SELLER_SELECTED → PAID → SELLER_ACCEPTED → PREPARING → READY_FOR_PICKUP → PICKED_UP → DELIVERED

Failure States (Terminal):
- SELLER_REJECTED (allows fallback to SELLER_SELECTED)
- ORDER_EXPIRED
- DELIVERY_FAILED
- USER_CANCELLED
```

**Status:** ✅ State machine defined, ready for implementation

---

## PART 4: IMPLEMENTATION READINESS CHECKLIST

### Documentation ✅
- [x] PRD state machine fixed
- [x] API Contract updated with ORDER_EXPIRED
- [x] Technical Architecture has Category Handler Pattern section
- [x] All GLOBAL PRODUCT TRUTHS documented
- [x] Sprint 2 DO NOT BREAK RULES created

### Architecture Prep ✅
- [x] CategoryHandler interface defined
- [x] PrintingCategoryHandler outline created
- [x] Order State Machine types defined
- [x] State transition validation functions defined

### Code Structure ✅
- [x] Interface files created (no implementation yet)
- [x] Type definitions ready
- [x] Method stubs in place

### Validation ✅
- [x] No if/else by category in existing code
- [x] Order schema supports one seller per order
- [x] State machine matches documentation
- [x] All architectural rules documented

---

## PART 5: NEXT STEPS (Sprint 2 Implementation)

### Day 1-2: Order State Machine
1. Implement StateMachineGuard
2. Implement state transition validation in OrdersService
3. Implement OrderStateHistory tracking
4. Write tests for state transitions

### Day 2-3: Category Handler Pattern
1. Implement CategoryRegistry
2. Complete PrintingCategoryHandler implementation
3. Integrate handlers into OrdersService
4. Remove any category-specific if/else logic

### Day 3-4: Order Creation Flow
1. Implement order creation (CREATED state)
2. Implement seller selection (CREATED → SELLER_SELECTED)
3. Implement delivery quote (stubbed pricing)
4. Implement order confirmation (SELLER_SELECTED → PAID, payment stubbed)

### Day 4-5: Seller Interaction Flow
1. Implement list incoming orders
2. Implement accept order (PAID → SELLER_ACCEPTED)
3. Implement reject order (PAID → SELLER_REJECTED)
4. Implement mark ready (PREPARING → READY_FOR_PICKUP)

---

## ✅ READINESS STATUS: READY FOR SPRINT 2

**All documentation gaps fixed.**  
**All architectural rules defined.**  
**All interface definitions prepared.**  
**Implementation can begin.**

---

**This document confirms Sprint 2 is ready to begin implementation.**  
**All pre-requisites are met.**
