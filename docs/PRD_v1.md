* * *

📘 **PRD v1 – Product Requirements Document**
=============================================

**Product:** Local Commerce Coordination Platform  
**Version:** v1.0  
**Stage:** MVP  
**City:** Gurgaon (limited area)  
**Apps:** User App + Seller App  
**PM Owner:** ChatGPT  
**North Star Metric:** Daily Completed Orders (DCO)

* * *

1\. Product Overview
--------------------

### 1.1 What We Are Building

A **category‑agnostic local order coordination platform** that allows:

*   Users to place orders with nearby sellers
    
*   Sellers to accept and fulfill orders
    
*   Delivery to be handled via aggregated third‑party partners
    

### 1.2 MVP Constraint

*   System is **generic**
    
*   **Only Printing is live** in v1
    
*   Other categories are visible as _Coming Soon_
    

* * *

2\. User Personas
-----------------

### 2.1 User App Personas

**Primary**

*   Individual users
    
*   Office admins
    

**Core traits**

*   Time‑sensitive
    
*   Comfortable paying delivery fees
    
*   Need reliability over discounts
    

* * *

### 2.2 Seller App Personas

**Primary**

*   Local print shop owners
    

**Core traits**

*   Walk‑in focused
    
*   Digitally capable
    
*   No in‑house delivery
    

* * *

3\. Success Metrics
-------------------

### 3.1 Primary Metric

*   **Daily Completed Orders (DCO)**
    

### 3.2 Secondary Metrics (Tracking Only)

*   Order success rate
    
*   Avg fulfillment time
    
*   % orders requiring admin intervention
    
*   Seller acceptance rate
    

* * *

4\. User App – Functional Requirements
--------------------------------------

### 4.1 Home Screen

**Purpose:** Entry point, category discovery

**Requirements**

*   Shows list of categories
    
*   Printing = Active
    
*   Others = “Coming Soon”
    
*   CTA: “Create Order”
    

* * *

### 4.2 Category Selection

**Requirements**

*   User selects a category
    
*   Only Printing proceeds to next step
    
*   Coming Soon categories show toast/modal
    

* * *

### 4.3 Order Creation (Category‑Agnostic)

**Printing Flow Requirements**

*   Upload file (PDF / DOC / IMG)
    
*   Auto detect pages
    
*   User can edit:
    
    *   Pages
        
    *   Copies
        
    *   Color/B&W
        
*   Optional instructions
    

* * *

### 4.4 Shop Discovery

**Requirements**

*   List nearby sellers offering selected category
    
*   Show:
    
    *   Price
        
    *   Distance
        
    *   Estimated prep time
        
*   User selects one shop
    
*   Only Online sellers are listed
    

* * *

### 4.5 Price Breakdown

**Requirements**

*   Show:
    
    *   Item cost
        
    *   Delivery fee
        
    *   Total payable
        
*   No hidden charges
    
*   User confirms order
    

* * *

### 4.6 Payment

**Requirements**

*   UPI support (initial)
    
*   Order is created only after payment success
    

* * *

### 4.7 Order Tracking

**States shown to user**

*   Order Placed
    
*   Accepted by Seller
    
*   Preparing
    
*   Picked Up
    
*   Delivered
    
*   Cancelled / Failed
    

* * *

### 4.8 Order Completion

**Requirements**

*   Invoice display
    
*   Reorder option
    
*   Support access
    

* * *

5\. Seller App – Functional Requirements
----------------------------------------

### 5.1 Authentication

*   Mobile OTP login
    

* * *

### 5.2 Seller Availability

**Requirements**

*   Sellers can toggle Online / Offline status
    
*   Default state after login is Offline
    
*   Sellers receive new orders only when Online
    

* * *

### 5.3 Order Inbox

**Requirements**

*   Real‑time incoming orders
    
*   Show:
    
    *   File preview
        
    *   Instructions
        
    *   Price
        
*   Actions:
    
    *   Accept
        
    *   Reject
        

* * *

### 5.4 Order Fulfillment

**Requirements**

*   After accept:
    
    *   Seller sees order details
        
    *   Prepares order
        
*   Seller marks:
    
    *   “Ready for Pickup”
        

* * *

### 5.5 Order History

**Requirements**

*   List of completed orders
    
*   Basic visibility only (no analytics v1)
    

* * *

6\. Admin (Internal Tool) – Functional Requirements
---------------------------------------------------

### 6.1 Order Oversight

*   View all orders
    
*   Filter by status
    

### 6.2 Manual Controls

*   Reassign seller
    
*   Reassign delivery partner
    
*   Cancel / refund order
    

* * *

7\. Delivery Aggregation Logic
------------------------------

### 7.1 Core Requirements

*   Platform does **not** own fleet
    
*   On “Ready for Pickup”:
    
    *   System fetches delivery quotes
        
    *   Chooses best available option
        
*   Manual fallback allowed
    

### 7.2 Failure Handling

*   If no delivery partner accepts:
    
    *   Notify admin
        
    *   Notify user
        
    *   Allow reschedule or cancel
        

* * *

8\. Order Lifecycle (State Machine)
-----------------------------------

nginx

Copy code

`CREATED → PAID → SELLER_ACCEPTED → PREPARING → READY_FOR_PICKUP → PICKED_UP → DELIVERED`

**Failure States**

*   SELLER\_REJECTED
    
*   DELIVERY\_FAILED
    
*   USER\_CANCELLED (before pickup)
    
### Order Flow Rules

*   Sellers going Offline cannot receive new orders
    
*   Sellers must complete already accepted orders
    
* * *

9\. Non‑Functional Requirements
-------------------------------

### Performance

*   Order creation < 30 seconds
    
*   Seller notification < 5 seconds
    

### Reliability

*   No order loss
    
*   State must be recoverable
    
*   Availability state updates must propagate in near real-time
    

### Scalability

*   Category‑agnostic by design
    
*   Multi‑seller, multi‑category ready
    

* * *

10\. Out of Scope (PRD Level)
-----------------------------

*   Discounts
    
*   Loyalty
    
*   Reviews & ratings
    
*   Seller analytics
    
*   Multiple live categories
    
*   Subscriptions
    

* * *

11\. Guardrails (PM Enforcement)
--------------------------------

*   No new category goes live without PM approval
    
*   No UI changes without PRD update
    
*   No feature added unless it improves DCO
    

* * *

12\. MVP Acceptance Criteria
----------------------------

MVP is considered **ready to launch** when:

*   User can place an order end‑to‑end
    
*   Seller can accept and mark ready
    
*   Delivery can be assigned
    
*   Order reaches Delivered state
    
*   Admin can intervene if needed
    
