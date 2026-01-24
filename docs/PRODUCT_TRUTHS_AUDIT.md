# PRODUCT TRUTHS AUDIT & DOCUMENTATION UPDATES
## Senior Product Engineer Assessment

**Date:** 2026-01-24  
**Purpose:** Ensure all GLOBAL PRODUCT TRUTHS are explicitly documented to prevent architectural drift  
**Status:** Pre-Sprint 2 Safety Check

---

## PART 1: CONTEXT COVERAGE MATRIX

### GLOBAL PRODUCT TRUTHS → DOCUMENT COVERAGE

| # | Product Truth | BRD | PRD | API Contract | Tech Arch | Status |
|---|---------------|-----|-----|--------------|-----------|--------|
| 1 | Order is a generic, category-agnostic aggregate | ✅ | ✅ | ✅ | ✅ | **COVERED** |
| 2 | Category-specific logic MUST be pluggable via handlers (no if/else by category) | ⚠️ | ⚠️ | ⚠️ | ⚠️ | **IMPLICIT** |
| 3 | Printing is the first concrete category; others will be added later | ✅ | ✅ | ✅ | ✅ | **COVERED** |
| 4 | File upload is OPTIONAL and category-dependent | ⚠️ | ⚠️ | ⚠️ | ❌ | **IMPLICIT** |
| 5 | Delivery is OPTIONAL per order | ❌ | ❌ | ❌ | ❌ | **MISSING** |
| 6 | Seller may deliver directly OR via third-party aggregator | ❌ | ❌ | ❌ | ❌ | **MISSING** |
| 7 | Multiple delivery aggregators will exist in the future | ✅ | ✅ | ✅ | ✅ | **COVERED** |
| 8 | Users may place orders from MULTIPLE sellers in one checkout | ❌ | ❌ | ❌ | ❌ | **MISSING** |
| 9 | System must split such requests into independent seller-specific Orders | ❌ | ❌ | ❌ | ❌ | **MISSING** |
| 10 | Seller availability (ONLINE/OFFLINE) is a hard gate | ✅ | ✅ | ✅ | ✅ | **COVERED** |
| 11 | Orders have a strict state machine with guarded transitions | ✅ | ✅ | ✅ | ✅ | **COVERED** |
| 12 | Fallback to another seller is allowed if one rejects | ⚠️ | ⚠️ | ⚠️ | ⚠️ | **IMPLICIT** |
| 13 | Order expiry / timeout is a real state (even if enforcement is later) | ⚠️ | ⚠️ | ⚠️ | ⚠️ | **IMPLICIT** |
| 14 | No single Order should ever depend on multiple sellers | ❌ | ❌ | ❌ | ❌ | **MISSING** |
| 15 | AI-based decision making is a FUTURE concern; do not implement now | ❌ | ❌ | ❌ | ❌ | **MISSING** |

**Coverage Score: 6/15 Fully Covered, 5/15 Implicit, 4/15 Missing**

---

## PART 2: REQUIRED DOCUMENT UPDATES

### 📄 BRD v1 Updates Required

**Section to Update:** 5. In Scope (MVP v1) - Platform Capabilities

**Add:**
- Explicitly state that delivery is OPTIONAL per order (some orders may be pickup-only)
- Explicitly state that sellers may handle delivery directly OR via platform-coordinated third-party aggregators
- Add note: "Multi-seller checkout capability is designed but not in MVP v1 scope"

**Section to Update:** 13. Guiding Principles (Non-Negotiable)

**Add:**
- "Category-specific logic must be pluggable via handlers (no if/else by category)"
- "File uploads are optional and category-dependent (not all categories require files)"
- "Each Order is independent and maps to exactly one seller (no multi-seller orders)"
- "AI-based decision making is explicitly out of scope for MVP"

---

### 📘 PRD v1 Updates Required

**Section to Update:** 4.3 Order Creation (Category-Agnostic)

**Add:**
- "File upload is OPTIONAL and category-dependent. Printing requires files, but future categories (e.g., stationery) may not."
- "Category-specific validation and processing logic is handled via pluggable category handlers, not hardcoded if/else statements."

**Section to Update:** 7. Delivery Aggregation Logic

**Add:**
- "Delivery is OPTIONAL per order. Some orders may be pickup-only (user collects from seller)."
- "Sellers may choose to handle delivery directly (self-delivery) OR via platform-coordinated third-party aggregators."
- "When seller chooses self-delivery, platform does not assign third-party delivery."

**Section to Update:** 8. Order Lifecycle (State Machine)

**Add:**
- "If seller rejects order, system allows fallback to another seller (user can select different seller for same order request)."
- "ORDER_EXPIRED is a valid failure state (timeout enforcement may be implemented later, but state exists)."
- "Each Order maps to exactly ONE seller. No single Order can depend on multiple sellers."

**Section to Update:** 10. Out of Scope (PRD Level)

**Add:**
- "Multi-seller checkout (placing orders from multiple sellers in one transaction) - designed for future, not MVP v1"
- "AI-based seller selection or pricing decisions - explicitly out of scope"
- "Category-specific logic via hardcoded if/else - must use pluggable handlers"

**New Section:** 13. Multi-Seller Checkout (Future Design)

**Add:**
- "Users may place orders from MULTIPLE sellers in one checkout session."
- "System MUST split such requests into independent seller-specific Orders."
- "Each resulting Order is independent and follows normal state machine."
- "This capability is designed but not implemented in MVP v1."

---

### 📜 API Contract v1 Updates Required

**Section to Update:** 7. ORDER STATE MACHINE (ENFORCED)

**Add:**
- "ORDER_EXPIRED is a valid failure state (timeout enforcement may be implemented later)."

**Section to Update:** 8. NON-NEGOTIABLE CONTRACT RULES

**Add:**
- "Each Order maps to exactly ONE seller_id. No Order can have multiple sellers."
- "Delivery is optional per order. If delivery is not required, delivery-related fields may be null."
- "File upload is optional and category-dependent. Categories define their own file requirements."

**New Section:** 9. CATEGORY HANDLER ARCHITECTURE

**Add:**
- "Category-specific logic (validation, pricing, processing) is handled via pluggable category handlers."
- "No if/else statements based on category name in core order flow."
- "Adding a new category requires implementing a category handler, not modifying core order logic."

**New Section:** 10. MULTI-SELLER CHECKOUT (FUTURE)

**Add:**
- "Future API v2 will support multi-seller checkout where user selects items from multiple sellers."
- "System will split such requests into independent Orders (one per seller)."
- "Each Order follows standard state machine independently."
- "Not in MVP v1 scope."

---

### 🏗️ Technical Architecture v1 Updates Required

**Section to Update:** 5. Core Domain Decisions

**Add:**
- "Delivery is OPTIONAL per order. Order.delivery_id may be null for pickup-only orders."
- "Sellers may handle delivery directly (self-delivery) OR via platform-coordinated third-party aggregators."
- "Each Order maps to exactly ONE seller. No Order can have multiple sellers."
- "Category-specific logic is implemented via pluggable handlers (CategoryHandler interface), not if/else statements."

**Section to Update:** 6. Order State Machine (ENFORCED SERVER-SIDE)

**Add:**
- "ORDER_EXPIRED is a valid failure state. Timeout enforcement may be implemented later, but state exists in schema."
- "If seller rejects order, system allows fallback to another seller (user can select different seller)."

**Section to Update:** 9. Delivery Aggregation Strategy

**Add:**
- "Delivery is OPTIONAL per order. Some orders are pickup-only."
- "Sellers may choose self-delivery (seller handles delivery directly) OR third-party delivery (platform coordinates)."
- "When seller chooses self-delivery, platform does not assign third-party delivery aggregator."

**New Section:** 16. CATEGORY HANDLER PATTERN

**Add:**
- "Category-specific logic (validation, pricing, processing) is implemented via pluggable CategoryHandler interface."
- "Each category implements CategoryHandler with methods: validatePayload(), calculatePrice(), processOrder()."
- "Core order flow calls handler methods, never checks category name with if/else."
- "Adding new category = implement new handler, register in CategoryRegistry, no changes to core order logic."

**New Section:** 17. MULTI-SELLER CHECKOUT DESIGN (FUTURE)

**Add:**
- "Users may place orders from multiple sellers in one checkout session."
- "System splits such requests into independent Orders (one per seller)."
- "Each Order follows standard state machine independently."
- "This is designed but not implemented in MVP v1."

**New Section:** 18. EXPLICITLY OUT OF SCOPE (MVP)

**Add:**
- "AI-based seller selection or pricing decisions"
- "Hardcoded if/else statements based on category name"
- "Multi-seller checkout (designed for future, not MVP v1)"

---

## PART 3: SPRINT 2 "DO NOT BREAK" RULES

### 🚨 CRITICAL ARCHITECTURAL RULES (MUST NOT VIOLATE)

#### Orders Module

1. **Order-Seller Relationship**
   - ❌ **DO NOT:** Create Orders that depend on multiple sellers
   - ✅ **MUST:** Each Order has exactly one seller_id
   - ✅ **MUST:** Order.seller_id is required (non-nullable)

2. **Category Handler Pattern**
   - ❌ **DO NOT:** Add if/else statements checking category name in order flow
   - ❌ **DO NOT:** Hardcode printing-specific logic in OrdersService
   - ✅ **MUST:** Use CategoryHandler interface for category-specific logic
   - ✅ **MUST:** Register handlers in CategoryRegistry
   - ✅ **MUST:** Call handler.validatePayload(), handler.calculatePrice(), handler.processOrder()

3. **Order State Machine**
   - ❌ **DO NOT:** Allow state transitions that bypass the state machine
   - ❌ **DO NOT:** Create Orders without initial CREATED state
   - ✅ **MUST:** Validate all state transitions via StateMachineGuard
   - ✅ **MUST:** Track state history in OrderStateHistory table
   - ✅ **MUST:** Support ORDER_EXPIRED as a valid failure state (even if timeout enforcement is later)

4. **File Upload**
   - ❌ **DO NOT:** Require file upload for all orders
   - ❌ **DO NOT:** Hardcode file validation for printing only
   - ✅ **MUST:** Make file upload optional (Order.file_id nullable)
   - ✅ **MUST:** Validate file requirements via CategoryHandler (not hardcoded)

5. **Seller Rejection Handling**
   - ❌ **DO NOT:** Delete Order when seller rejects
   - ✅ **MUST:** Allow user to select different seller for same order request
   - ✅ **MUST:** Transition to SELLER_REJECTED state, then allow SELLER_SELECTED again

#### Categories Module

6. **Category Handler Registration**
   - ❌ **DO NOT:** Hardcode category logic in CategoriesService
   - ✅ **MUST:** Use CategoryHandler interface
   - ✅ **MUST:** Register handlers in module initialization
   - ✅ **MUST:** Handler selection via CategoryRegistry.getHandler(categoryId)

#### Delivery Module

7. **Optional Delivery**
   - ❌ **DO NOT:** Require delivery for all orders
   - ❌ **DO NOT:** Auto-assign delivery for pickup-only orders
   - ✅ **MUST:** Make delivery optional (Order.delivery_id nullable)
   - ✅ **MUST:** Check Order.requires_delivery flag before assigning delivery
   - ✅ **MUST:** Support seller self-delivery (seller handles delivery directly)

8. **Delivery Aggregator Pattern**
   - ❌ **DO NOT:** Hardcode single delivery provider
   - ✅ **MUST:** Use DeliveryProvider adapter interface
   - ✅ **MUST:** Support multiple providers (Dunzo, Porter, etc.)
   - ✅ **MUST:** Select provider via DeliveryProviderRegistry

#### Sellers Module

9. **Seller Availability Gate**
   - ❌ **DO NOT:** Show OFFLINE sellers in discovery
   - ❌ **DO NOT:** Allow orders to be routed to OFFLINE sellers
   - ✅ **MUST:** Filter sellers by status = ONLINE in discovery endpoint
   - ✅ **MUST:** Enforce availability check before order assignment

#### Multi-Seller Checkout (Future Design)

10. **Order Splitting (Future)**
    - ❌ **DO NOT:** Implement multi-seller checkout in Sprint 2
    - ✅ **MUST:** Design Order splitting logic for future (not implement)
    - ✅ **MUST:** Ensure current Order schema supports one seller per order
    - ✅ **MUST:** Document splitting logic for future implementation

#### AI/Decision Making

11. **No AI Logic**
    - ❌ **DO NOT:** Add AI-based seller selection
    - ❌ **DO NOT:** Add AI-based pricing decisions
    - ✅ **MUST:** Use deterministic rules (distance, availability, price)
    - ✅ **MUST:** Keep decision logic simple and transparent

---

## PART 4: CONTRADICTIONS & AMBIGUITIES FOUND

### 🔴 CRITICAL CONTRADICTIONS

1. **State Machine Mismatch**
   - **PRD Line 371:** `CREATED → PAID → SELLER_ACCEPTED`
   - **API Contract:** `CREATED → SELLER_SELECTED → PAID → SELLER_ACCEPTED`
   - **Resolution:** API Contract is correct. PRD must be updated.

2. **ORDER_EXPIRED State**
   - **Tech Arch:** Lists ORDER_EXPIRED as failure state
   - **API Contract:** Does not list ORDER_EXPIRED
   - **Resolution:** Add ORDER_EXPIRED to API Contract failure states.

### ⚠️ AMBIGUITIES

1. **File Upload Requirements**
   - **Current:** PRD says "Upload file" for printing, but doesn't state it's optional for other categories
   - **Clarification Needed:** Explicitly state file upload is optional and category-dependent

2. **Delivery Optionality**
   - **Current:** Docs assume all orders need delivery
   - **Clarification Needed:** Explicitly state delivery is optional (pickup-only orders exist)

3. **Seller Self-Delivery**
   - **Current:** Docs only mention third-party aggregators
   - **Clarification Needed:** Explicitly state sellers may handle delivery directly

4. **Category Handler Pattern**
   - **Current:** Docs say "category-agnostic" but don't specify handler pattern
   - **Clarification Needed:** Explicitly document CategoryHandler interface and registration

5. **Multi-Seller Checkout**
   - **Current:** Not mentioned anywhere
   - **Clarification Needed:** Explicitly state this is designed for future, not MVP v1

---

## PART 5: DOCUMENTATION UPDATE PRIORITY

### 🔴 HIGH PRIORITY (Before Sprint 2)

1. **Fix PRD state machine** (Line 371) - CRITICAL
2. **Add ORDER_EXPIRED to API Contract** - CRITICAL
3. **Document Category Handler pattern** in Tech Arch - CRITICAL
4. **Document optional delivery** in all docs - HIGH
5. **Document seller self-delivery option** in all docs - HIGH

### ⚠️ MEDIUM PRIORITY (Before Sprint 3)

6. **Document file upload optionality** in all docs
7. **Document multi-seller checkout design** (future) in Tech Arch
8. **Document order splitting logic** (future) in Tech Arch

### 📝 LOW PRIORITY (Before Launch)

9. **Add AI out-of-scope statement** to all docs
10. **Clarify seller rejection fallback** in PRD

---

## PART 6: VALIDATION CHECKLIST

Before any Sprint 2 code is written, verify:

- [ ] PRD state machine matches API Contract
- [ ] ORDER_EXPIRED added to API Contract
- [ ] Category Handler pattern documented in Tech Arch
- [ ] Optional delivery documented in all docs
- [ ] Seller self-delivery documented in all docs
- [ ] File upload optionality documented in all docs
- [ ] Multi-seller checkout (future) documented in Tech Arch
- [ ] Order-seller relationship (one-to-one) documented
- [ ] No AI logic statement added to all docs

---

## FINAL RECOMMENDATIONS

1. **Immediate Actions (Before Sprint 2):**
   - Update PRD state machine (Line 371)
   - Add ORDER_EXPIRED to API Contract
   - Document Category Handler pattern in Tech Arch
   - Document optional delivery in all docs

2. **Sprint 2 Code Review Checklist:**
   - No if/else based on category name
   - No Orders with multiple sellers
   - No hardcoded file requirements
   - No required delivery for all orders
   - Category handlers used for category-specific logic

3. **Architectural Guardrails:**
   - Code review must check for Category Handler pattern compliance
   - State machine transitions must be validated
   - Order-seller relationship must be one-to-one
   - Delivery must be optional

---

**Document Status:** This audit is the final source of truth for Sprint 2 implementation.  
**Next Review:** After Sprint 2 completion to verify no architectural drift occurred.
