# SPRINT 2 EXECUTION RULES
## DO NOT BREAK RULES - Final Source of Truth

**Date:** 2026-01-24  
**Sprint:** Sprint 2 - Order Flow & State Machine (CRITICAL PATH)  
**Status:** Pre-Implementation

---

## 🚨 CRITICAL ARCHITECTURAL RULES (MUST NOT VIOLATE)

### 1. Category Handler Pattern (NON-NEGOTIABLE)

**DO NOT:**
- ❌ Add if/else statements checking category name in OrdersService
- ❌ Hardcode printing-specific logic in OrdersService
- ❌ Access category-specific fields directly in OrdersService
- ❌ Create category-specific methods in OrdersService

**MUST:**
- ✅ OrdersService MUST NOT know category details
- ✅ OrdersService calls `categoryRegistry.getHandler(categoryId)` to get handler
- ✅ All category-specific logic lives in CategoryHandler implementations
- ✅ Exactly ONE CategoryHandler is implemented in Sprint 2 (PrintingCategoryHandler)
- ✅ CategoryHandler interface is defined before any implementation

### 2. Order-Seller Relationship (NON-NEGOTIABLE)

**DO NOT:**
- ❌ Create Orders that depend on multiple sellers
- ❌ Allow Order.seller_id to be null
- ❌ Create Orders without a seller_id

**MUST:**
- ✅ Each Order has exactly one seller_id (required, non-nullable)
- ✅ No single Order can have multiple sellers
- ✅ Order-seller relationship is one-to-one

### 3. Order State Machine (NON-NEGOTIABLE)

**DO NOT:**
- ❌ Allow state transitions that bypass the state machine
- ❌ Create Orders without initial CREATED state
- ❌ Allow invalid state transitions
- ❌ Skip state history tracking

**MUST:**
- ✅ Order State Machine is enforced server-side
- ✅ All state transitions are validated via StateMachineGuard
- ✅ Invalid state transitions MUST throw errors (do not silently fail)
- ✅ OrderStateHistory MUST be written on every transition
- ✅ State machine follows exact sequence: CREATED → SELLER_SELECTED → PAID → SELLER_ACCEPTED → PREPARING → READY_FOR_PICKUP → PICKED_UP → DELIVERED
- ✅ Failure states are terminal: SELLER_REJECTED, ORDER_EXPIRED, DELIVERY_FAILED, USER_CANCELLED

### 4. File Upload (NON-NEGOTIABLE)

**DO NOT:**
- ❌ Require file upload for all orders
- ❌ Hardcode file validation for printing only
- ❌ Assume all categories need files

**MUST:**
- ✅ Make file upload optional (Order.file_id nullable)
- ✅ Validate file requirements via CategoryHandler.getFileRequirements()
- ✅ CategoryHandler defines whether files are required

### 5. Delivery (NON-NEGOTIABLE)

**DO NOT:**
- ❌ Require delivery for all orders
- ❌ Auto-assign delivery for pickup-only orders
- ❌ Assume all orders need delivery

**MUST:**
- ✅ Make delivery optional (Order.delivery_id nullable)
- ✅ Check Order.requires_delivery flag before assigning delivery
- ✅ Support pickup-only orders (delivery_id = null)

### 6. Timeout Handling (DEFINED BUT NOT ENFORCED)

**DO NOT:**
- ❌ Implement timeout enforcement logic in Sprint 2
- ❌ Create timeout jobs in Sprint 2
- ❌ Auto-expire orders in Sprint 2

**MUST:**
- ✅ ORDER_EXPIRED state exists in schema and state machine
- ✅ Timeout values are DEFINED (documented) but NOT enforced yet
- ✅ Timeout enforcement is deferred to Sprint 3

### 7. Payment Integration (STUBBED)

**DO NOT:**
- ❌ Integrate real payment gateway in Sprint 2
- ❌ Implement payment webhook handling in Sprint 2
- ❌ Finalize payment logic in Sprint 2

**MUST:**
- ✅ Payment is stubbed (order transitions to PAID state without real payment)
- ✅ Payment finalization logic is deferred to Sprint 3

### 8. Delivery Provider Abstractions (NOT IMPLEMENTED)

**DO NOT:**
- ❌ Implement delivery provider adapters in Sprint 2
- ❌ Integrate real delivery aggregators in Sprint 2
- ❌ Create delivery assignment logic in Sprint 2

**MUST:**
- ✅ Delivery provider abstractions are NOT implemented in Sprint 2
- ✅ Delivery assignment is deferred to Sprint 3

### 9. Seller Availability Gate (ENFORCED)

**DO NOT:**
- ❌ Show OFFLINE sellers in discovery
- ❌ Allow orders to be routed to OFFLINE sellers
- ❌ Bypass availability check

**MUST:**
- ✅ Filter sellers by status = ONLINE in discovery endpoint
- ✅ Enforce availability check before order assignment
- ✅ Seller availability is a hard gate (cannot be bypassed)

### 10. Seller Rejection Handling (FALLBACK ALLOWED)

**DO NOT:**
- ❌ Delete Order when seller rejects
- ❌ Prevent user from selecting different seller after rejection

**MUST:**
- ✅ Allow user to select different seller for same order request after rejection
- ✅ Transition to SELLER_REJECTED state, then allow SELLER_SELECTED again
- ✅ Support fallback to another seller

---

## 📋 SPRINT 2 IMPLEMENTATION SCOPE

### ✅ IN SCOPE (Sprint 2)

1. **Category Handler Pattern**
   - Define CategoryHandler interface
   - Implement PrintingCategoryHandler
   - Implement CategoryRegistry
   - Integrate handlers into OrdersService

2. **Order State Machine**
   - Define state machine (states + transitions)
   - Implement StateMachineGuard
   - Implement state transition validation
   - Implement OrderStateHistory tracking

3. **Order Creation Flow**
   - Create order (CREATED state)
   - Select seller (CREATED → SELLER_SELECTED)
   - Get delivery quote (pricing logic - stubbed)
   - Confirm order (SELLER_SELECTED → PAID, payment stubbed)

4. **Seller Interaction Flow**
   - List incoming orders (status filter)
   - Accept order (PAID → SELLER_ACCEPTED)
   - Reject order (PAID → SELLER_REJECTED)
   - Mark ready (PREPARING → READY_FOR_PICKUP)

5. **File Upload (Basic)**
   - S3 integration setup
   - Presigned URL generation
   - File validation (type, size)
   - Connect to order creation

### ❌ OUT OF SCOPE (Sprint 2)

1. **Payment Integration** - Deferred to Sprint 3
2. **Delivery Provider Abstractions** - Deferred to Sprint 3
3. **Timeout Enforcement** - Deferred to Sprint 3
4. **Real-time Notifications** - Deferred to Sprint 3
5. **Queue/Background Jobs** - Deferred to Sprint 3

---

## ✅ VALIDATION CHECKLIST

Before any Sprint 2 code is merged:

- [ ] No if/else statements checking category name in OrdersService
- [ ] CategoryHandler interface is defined
- [ ] PrintingCategoryHandler is implemented
- [ ] CategoryRegistry is implemented
- [ ] OrdersService uses handlers (no direct category logic)
- [ ] Order State Machine is enforced server-side
- [ ] Invalid state transitions throw errors
- [ ] OrderStateHistory is written on every transition
- [ ] Each Order has exactly one seller_id
- [ ] File upload is optional (Order.file_id nullable)
- [ ] Delivery is optional (Order.delivery_id nullable)
- [ ] Seller availability gate is enforced
- [ ] Seller rejection allows fallback to different seller
- [ ] ORDER_EXPIRED state exists (but not enforced yet)
- [ ] Payment is stubbed (no real gateway integration)
- [ ] No delivery provider abstractions implemented

---

## 🎯 SUCCESS CRITERIA

Sprint 2 is complete when:

- ✅ User can create draft order with file upload (printing)
- ✅ User can see nearby sellers with prices and distance
- ✅ User can select seller (state transitions: CREATED → SELLER_SELECTED)
- ✅ User can get delivery quote (stubbed pricing)
- ✅ State machine prevents invalid transitions
- ✅ Seller sees incoming orders when ONLINE
- ✅ Seller can accept/reject orders (state transitions validated)
- ✅ Seller can mark order ready (state transitions validated)
- ✅ Order state history is tracked
- ✅ File upload works via S3 presigned URLs
- ✅ All state transitions are validated
- ✅ Category Handler pattern is implemented (no if/else by category)
- ✅ OrdersService is category-agnostic

---

**This document is the final source of truth for Sprint 2 implementation.**  
**Any deviation from these rules requires explicit approval from Senior Product Engineer.**
