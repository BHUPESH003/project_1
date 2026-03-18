# Project Requirements (MATHA Cognitive Layer)

## Overview

This project exists to eliminate the coordination gap between users who need urgent local items/services and local sellers who lack digital order intake and delivery capability. Users currently rely on physical visits, phone calls, WhatsApp, and separate delivery booking—resulting in time waste, uncertainty, and failed fulfillment. Local sellers (e.g., print shops) operate 100% walk-in with no delivery capability and miss demand that expects doorstep delivery. The platform coordinates **order + seller + delivery** across multiple local categories without owning inventory or fleet. It is asset-light, category-agnostic by design, and uses aggregated third-party delivery providers. The North Star metric is Daily Completed Orders (DCO).

## Business Rules

- **Order–Seller cardinality**: Each Order maps to exactly ONE seller. `Order.seller_id` is required and non-nullable. No single Order can depend on multiple sellers.
- **Order state machine (server-enforced)**: Valid success flow is `CREATED → SELLER_SELECTED → PAID → SELLER_ACCEPTED → PREPARING → READY_FOR_PICKUP → PICKED_UP → DELIVERED`. Invalid transitions must throw errors. Frontends cannot skip or invent states.
- **Terminal failure states**: `SELLER_REJECTED`, `ORDER_EXPIRED`, `DELIVERY_FAILED`, `USER_CANCELLED` are terminal. No further transitions from these states.
- **Order creation only after payment**: An order is created/confirmed only after payment success. Payment must complete before order reaches `PAID`.
- **Seller availability gate**: Only sellers with status `ONLINE` receive new orders. Enforced at backend; frontend cannot override. Default state after login is `OFFLINE`.
- **Sellers must complete accepted orders**: A seller going Offline cannot receive new orders but must complete orders already accepted.
- **Seller rejection fallback**: If a seller rejects, the user may select a different seller for the same order request. The order remains in a state that allows seller reselection.
- **Order state history**: Every state transition must be tracked and persisted.
- **Category-agnostic order payload**: Order payload is opaque JSON. Category-specific logic is implemented via pluggable Category Handlers, not if/else in core order flow. Adding a category = implement handler + register in CategoryRegistry.
- **File upload is category-dependent**: File upload is optional and defined per category. Printing requires file upload (PDF/DOC/IMG); other categories may not.
- **Delivery is optional per order**: `Order.delivery_id` may be null for pickup-only orders. Sellers may use self-delivery or platform-coordinated third-party aggregators.
- **No hidden charges**: Price breakdown must show item cost, delivery fee, and total payable. User confirms before payment.
- **Revenue model**: User pays item price + delivery fee. Seller pays commission 5–8% (category-dependent). Delivery partner receives delivery fee.
- **Role-based access**: `USER`, `SELLER`, `ADMIN` roles determine allowed endpoints. Sellers cannot see other sellers’ data. Admin actions are privileged and audited.
- **API contract immutability**: Frontend cannot invent fields. Backend cannot change response shape without API version bump. Any breaking change = API v2.
- **Monorepo structure**: Shared types live in `/packages`. No cross-app imports except via shared packages. API is the single source of truth.
- **Performance invariants**: Order creation < 30 seconds; seller notification < 5 seconds; availability toggle propagates < 10 seconds. Zero silent failures—state must always be surfaced.

## Out of Scope

- **Owning inventory**: Platform does not hold or manage seller inventory.
- **Owning delivery fleet**: Delivery is via third-party aggregators only. No owned vehicles or drivers.
- **Discounts, promotions, loyalty programs**: Not in scope.
- **Subscriptions**: Not in scope.
- **Ratings and reviews**: Not in scope.
- **Seller analytics**: No analytics dashboards for sellers in v1.
- **Multiple live categories in MVP**: Only Printing is live in MVP v1. Other categories show as "Coming Soon."
- **Multi-seller checkout**: Placing orders from multiple sellers in one transaction is designed for future (API v2), not MVP v1.
- **AI-based seller selection or pricing**: No AI/ML for seller selection or pricing decisions.
- **Category-specific if/else in core services**: Must use pluggable Category Handler pattern; no hardcoded category branches in order flow.
- **Microservices**: Modular monolith only. No separate deployable services.
- **Real-time streaming / WebSockets**: Not required for MVP.
- **Seller scheduling**: No scheduling of availability windows.
- **Inventory management**: No stock tracking or reservation.
- **Analytics pipelines**: No dedicated analytics infrastructure.
- **Food / grocery categories in MVP**: Explicitly excluded.
- **Public city-wide launch**: MVP is semi-open, limited area (Gurgaon).

## Owner

**Business Owners:** Jogender Yadav, Bhupesh  
**PM:** ChatGPT
