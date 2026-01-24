
🏗️ TECHNICAL ARCHITECTURE v1 (MVP)
===================================

1️⃣ Architecture Style — **Decision**
-------------------------------------

### ✅ **Modular Monolith (Recommended & Locked)**

**Why**

*   MVP speed > theoretical scale
    
*   Single team, fast iteration
    
*   Avoids microservice tax
    
*   Clean separation possible inside one codebase
    

**What this means**

*   One backend service
    
*   Clear internal modules (not separate services)
    
*   Easy to split later _if needed_
    

* * *

2️⃣ High‑Level System Diagram (Text)
------------------------------------

User App ─┐
          ├──> API (Modular Monolith) ───> Database
Seller App ─┘           │
                         ├── File Storage
                         ├── Payment Gateway
                         └── Delivery Aggregators

* * *

3️⃣ Monorepo Structure (LOCKED)
-------------------------------

/apps
  /user-app        (React Native / Flutter)
  /seller-app      (React Native / Flutter)
  /admin-panel     (Web)

/services
  /api             (Backend)

/packages
  /types           (shared DTOs, enums)
  /validators
  /config


**Rules**

*   Shared types live in `/packages`
    
*   No cross‑app imports except via shared packages
    
*   API is the single source of truth
    

* * *

4️⃣ Backend Internal Modules (Inside Monolith)
----------------------------------------------

/api
 ├── auth
 ├── users
 ├── sellers
 │    └── availability
 ├── categories
 ├── orders
 │    └── state-machine
 ├── payments
 ├── delivery
 │    └── aggregators
 ├── files
 ├── admin
 └── notifications


Each module:

*   Owns its logic
    
*   Exposes functions to other modules
    
*   No circular dependencies
    

* * *

5️⃣ Core Domain Decisions (Very Important)
------------------------------------------

### 🔹 Order = Central Aggregate

*   Everything revolves around `Order`
    
*   All side effects hang off order state transitions
    

### 🔹 Seller Availability = Hard Gate

*   `ONLINE` sellers only
    
*   Enforced at backend level
    
*   Frontend cannot override
    

### 🔹 Category‑Agnostic by Design

*   Order payload is opaque JSON
    
*   Category-specific logic is implemented via **pluggable Category Handlers** (not if/else statements)
    
*   OrdersService is category-agnostic and calls handler methods
    
*   Adding a new category = implement new handler, register in CategoryRegistry
    
*   No category-specific if/else logic in core order flow

### 🔹 Order-Seller Relationship

*   **Each Order maps to exactly ONE seller** (Order.seller_id is required, non-nullable)
    
*   **No single Order can depend on multiple sellers**
    
*   Multi-seller checkout (future) is handled by **splitting** one checkout request into multiple independent Orders

### 🔹 Delivery Responsibility

*   **Delivery is OPTIONAL per order** (Order.delivery_id may be null for pickup-only orders)
    
*   **Sellers may handle delivery directly** (self-delivery) OR via platform-coordinated third-party aggregators
    
*   Delivery responsibility is determined per-order (not per-seller globally)
    

* * *

6️⃣ Order State Machine (ENFORCED SERVER‑SIDE)
----------------------------------------------



CREATED
→ SELLER_SELECTED
→ PAID
→ SELLER_ACCEPTED
→ PREPARING
→ READY_FOR_PICKUP
→ PICKED_UP
→ DELIVERED


**Failure States (Terminal States)**

*   SELLER\_REJECTED (seller rejects order; user can select different seller)
    
*   ORDER\_EXPIRED (timeout; enforcement may be implemented later, but state exists)
    
*   DELIVERY\_FAILED (delivery partner fails to complete)
    
*   USER\_CANCELLED (user cancels before pickup)
    

No frontend can skip or invent states.

* * *

7️⃣ Data Storage (MVP Choices)
------------------------------

### Primary DB

*   **PostgreSQL**
    

Why:

*   Strong consistency
    
*   Relational order flows
    
*   Easy reporting later
    

### File Storage

*   **S3‑compatible**
    
*   Files are immutable
    
*   Access via signed URLs
    

* * *

8️⃣ Async & Reliability
-----------------------

### MVP Rule

❌ No Kafka  
❌ No complex event buses

### Use:

*   Lightweight background jobs
    
*   Simple queue (Bull / SQS / equivalent)
    

Use cases:

*   Delivery assignment
    
*   Timeout handling
    
*   Notifications
    

* * *

9️⃣ Delivery Aggregation Strategy
---------------------------------

### v1 (MVP)

*   **Delivery is OPTIONAL per order** (pickup-only orders exist)
    
*   **Sellers may handle delivery directly** (self-delivery) OR via platform-coordinated third-party aggregators
    
*   Adapter pattern for third-party aggregators
    
*   One interface, multiple providers
    
    
scss

Copy code

DeliveryProvider
 ├── getQuote()
 ├── createTask()
 ├── cancelTask()


### v1 Fallback

*   Manual admin override allowed
    
*   Hard requirement for reliability
    

* * *

10️⃣ Payments (MVP Scope)
-------------------------

*   UPI only
    
*   Payment → Order confirmed
    
*   Refunds via admin/manual initially
    

No wallet. No split payments.

* * *

11️⃣ Notifications
------------------

### v1

*   Push notifications (basic)
    
*   SMS fallback if needed
    
*   No real‑time sockets required initially
    

* * *

12️⃣ Non‑Functional Requirements (Locked)
-----------------------------------------

*   Order creation < 30s
    
*   Seller notification < 5s
    
*   Availability toggle propagates < 10s
    
*   Zero silent failures (always surface state)
    

* * *

13️⃣ Security & Access
----------------------

*   JWT‑based auth
    
*   Role‑based access control
    
*   Seller cannot see other sellers’ data
    
*   Admin is privileged, audited
    

* * *

14️⃣ What We Are **NOT** Building (Hard No)
-------------------------------------------

*   Microservices
    
*   Real‑time streaming
    
*   Seller scheduling
    
*   Inventory management
    
*   Analytics pipelines
    
*   **AI-based seller selection or pricing decisions** (explicitly out of scope for MVP)
    
*   **Category-specific if/else logic in core services** (must use Category Handler pattern)
    
*   **Multi-seller checkout** (designed for future, not MVP v1)
    

* * *

15️⃣ Cursor Execution Strategy
------------------------------

**How to use Cursor effectively**

1.  Generate module skeletons
    
2.  Implement APIs per contract
    
3.  Write tests for state transitions
    
4.  Refactor safely inside monolith
    

Cursor ≠ architecture  
Cursor = speed multiplier

* * *

✅ ARCHITECTURE SIGN‑OFF
-----------------------

If you agree with this statement, reply **YES**:

> “We will build an MVP using a modular monolith, shared API, enforced order state machine, seller availability gating, and delivery aggregation via adapters.”
