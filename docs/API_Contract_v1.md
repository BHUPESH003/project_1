📜 API CONTRACT v1 (MVP)
========================

**Principles**

*   REST
    
*   JSON
    
*   Stateless
    
*   Role‑based access
    
*   Category‑agnostic
    
*   Versioned (`/v1`)
    

* * *

0️⃣ COMMON CONVENTIONS
----------------------

### Auth

*   OTP based
    
*   Token returned after verification
    
*   Token sent in headers
    

makefile

Copy code

`Authorization: Bearer <token>`

* * *

### Roles

*   `USER`
    
*   `SELLER`
    
*   `ADMIN`
    

Role determines allowed endpoints.

* * *

### Core Objects (Shared Vocabulary)

json

Copy code

`User {   id   role   phone }  Seller {   id   shop_name   categories[]   location }  Order {   id   category   seller_id   user_id   status   pricing   delivery }`

* * *

1️⃣ AUTH APIs (Shared)
======================

### Request OTP

`POST /v1/auth/request-otp`

json

Copy code

`{   "phone": "+91XXXXXXXXXX",   "role": "USER | SELLER" }`

* * *

### Verify OTP

`POST /v1/auth/verify-otp`

json

Copy code

`{   "phone": "+91XXXXXXXXXX",   "otp": "123456" }`

Response:

json

Copy code

`{   "token": "jwt_token",   "user": {     "id": "U123",     "role": "USER"   } }`

* * *

2️⃣ CATEGORY APIs (User App)
============================

### List Categories

`GET /v1/categories`

json

Copy code

`[   {     "id": "printing",     "name": "Printing",     "status": "ACTIVE"   },   {     "id": "stationery",     "name": "Stationery",     "status": "COMING_SOON"   } ]`

* * *

3️⃣ USER APP APIs
=================

* * *

### Create Order (Draft)

`POST /v1/orders`

json

Copy code

`{   "category": "printing",   "order_payload": {     "file_url": "s3://file.pdf",     "pages": 10,     "copies": 2,     "color": "bw",     "notes": "Staple"   } }`

Response:

json

Copy code

`{   "order_id": "O123",   "status": "CREATED" }`

* * *

### List Available Sellers

`GET /v1/sellers?category=printing&lat=..&lng=..`

Returns only sellers with status = ONLINE.

json

Copy code

`[   {     "seller_id": "S1",     "shop_name": "Fast Print",     "price_breakdown": {       "per_page": 3     },     "distance_km": 1.2,     "prep_time_min": 10   } ]`

* * *

### Select Seller

`POST /v1/orders/{order_id}/select-seller`

json

Copy code

`{   "seller_id": "S1" }`

* * *

### Get Delivery Quote

`POST /v1/orders/{order_id}/delivery-quote`

json

Copy code

`{   "drop_location": {     "lat": 28.45,     "lng": 77.02   } }`

Response:

json

Copy code

`{   "delivery_fee": 90,   "provider": "AUTO" }`

* * *

### Confirm & Pay

`POST /v1/orders/{order_id}/confirm`

json

Copy code

`{   "payment_method": "UPI" }`

* * *

### Track Order

`GET /v1/orders/{order_id}`

json

Copy code

`{   "order_id": "O123",   "status": "PREPARING",   "seller": {...},   "delivery": {...} }`

* * *

4️⃣ SELLER APP APIs
===================

* * *

### Get Incoming Orders

`GET /v1/seller/orders?status=PENDING`

* * *

### Accept Order

`POST /v1/seller/orders/{order_id}/accept`

* * *

### Reject Order

`POST /v1/seller/orders/{order_id}/reject`

json

Copy code

`{   "reason": "Busy" }`

* * *

### Mark Ready for Pickup

`POST /v1/seller/orders/{order_id}/ready`

* * *

### Seller Order History

`GET /v1/seller/orders?status=COMPLETED`

### Set Seller Status

`POST /v1/seller/status`

json

Copy code

`{   "status": "ONLINE | OFFLINE" }`

* * *

5️⃣ DELIVERY AGGREGATION APIs (Internal / Admin)
================================================

* * *

### Assign Delivery

`POST /v1/internal/delivery/assign`

json

Copy code

`{   "order_id": "O123" }`

Response:

json

Copy code

`{   "provider": "DUNZO",   "tracking_id": "D123" }`

* * *

### Delivery Status Webhook

`POST /v1/internal/delivery/webhook`

json

Copy code

`{   "order_id": "O123",   "status": "PICKED_UP" }`

* * *

6️⃣ ADMIN APIs
==============

* * *

### View All Orders

`GET /v1/admin/orders`

* * *

### Reassign Seller

`POST /v1/admin/orders/{order_id}/reassign-seller`

* * *

### Reassign Delivery

`POST /v1/admin/orders/{order_id}/reassign-delivery`

* * *

### Cancel / Refund

`POST /v1/admin/orders/{order_id}/cancel`

* * *

7️⃣ ORDER STATE MACHINE (ENFORCED)
==================================

**Success Flow (Enforced Server-Side)**

nginx

Copy code

`CREATED → SELLER_SELECTED → PAID → SELLER_ACCEPTED → PREPARING → READY_FOR_PICKUP → PICKED_UP → DELIVERED`

**Failure States (Terminal States)**

*   SELLER\_REJECTED (seller rejects order; user can select different seller)
    
*   ORDER\_EXPIRED (timeout; enforcement may be implemented later, but state exists)
    
*   DELIVERY\_FAILED (delivery partner fails to complete)
    
*   USER\_CANCELLED (user cancels before pickup)
    

* * *

8️⃣ NON‑NEGOTIABLE CONTRACT RULES
=================================

*   Frontend **cannot invent fields**
    
*   Backend **cannot change response shape**
    
*   Any change = **API v2**
    
*   Categories add data, not new flows
    
*   Seller availability is authoritative for order routing
    
*   **Each Order maps to exactly ONE seller_id** (no Order can have multiple sellers)
    
*   **Delivery is optional per order** (Order.delivery_id may be null for pickup-only orders)
    
*   **File upload is optional and category-dependent** (categories define their own file requirements)
    
*   **Seller actions are role-restricted** (only SELLER role can accept/reject/mark-ready)
    
*   **Multi-seller checkout** (future API v2): One checkout request may result in multiple independent Orders (one per seller)
    
