Product Context Summary
=======================

Vision
------

We are building a hyperlocal services marketplace that starts with **printing services** but is intentionally designed to evolve into a broader local commerce platform.

The core idea is:

> A user should be able to request almost anything that can be fulfilled by a nearby local business, and the platform should intelligently connect them to the best seller(s), delivery option(s), and fulfillment flow.

Initially, the platform focuses on printing because it is easy to validate operationally, but the architecture and product experience should not be printing-specific.

Examples of future categories:

*   Printing
    
*   Stationery
    
*   Gifts
    
*   Customized merchandise
    
*   Local services
    
*   Repair services
    
*   Food
    
*   Groceries
    
*   Any hyperlocal commerce category
    

The platform should feel closer to a blend of:

*   Swiggy
    
*   Zomato
    
*   Blinkit
    
*   Zepto
    

rather than a traditional ecommerce marketplace.

Core Marketplace Philosophy
===========================

The marketplace is seller-centric.

We do not own inventory.

We connect:

*   Users
    
*   Sellers
    
*   Delivery providers
    

The platform acts as an orchestration layer.

Sellers remain independent businesses.

Delivery can be:

*   Handled by delivery partners
    
*   Handled directly by sellers
    
*   Optional if customer chooses pickup
    

Key Product Insight
===================

A user request should not be tightly coupled to a specific category.

Instead:

User has a need.

The system finds the best way to fulfill that need.

Long term we want AI assistance that can:

*   Understand intent
    
*   Break down requirements
    
*   Suggest sellers
    
*   Suggest alternatives
    
*   Optimize fulfillment
    

Example:

User says:

"I need 200 color flyers and 50 business cards delivered by tomorrow."

The platform should eventually understand:

*   Printing required
    
*   Delivery required
    
*   Multiple products required
    
*   Multiple sellers may be needed
    

without forcing category-specific flows.

Multi Seller Philosophy
=======================

This is one of the most important product decisions.

The platform must support:

Single Seller Orders
--------------------

User orders everything from one seller.

Multi Seller Orders
-------------------

User may need:

*   Product A from Seller A
    
*   Product B from Seller B
    

because:

*   Seller A does not have all items
    
*   Seller B is cheaper
    
*   Seller B is closer
    
*   Seller B is faster
    

The user should still experience this as a single checkout journey.

Internally the system may create multiple seller orders.

This capability is considered a strategic advantage and should not be removed.

Delivery Philosophy
===================

Delivery is abstracted.

The platform should never be tied to one delivery provider.

We may use:

*   Uber Direct
    
*   Porter
    
*   Dunzo
    
*   Future providers
    

The business should be able to add or replace delivery providers without major product changes.

Delivery providers are implementation details.

The user only sees:

*   Cost
    
*   ETA
    
*   Tracking
    

Address Philosophy
==================

Address is a global concept.

The entire app uses one address system.

Inspired by:

*   Blinkit
    
*   Swiggy
    
*   Zepto
    

Behavior:

*   Address selected on app open
    
*   Address visible in home screen
    
*   Checkout uses selected address
    
*   User can change address anywhere
    
*   Saved addresses available
    
*   Recent addresses available
    
*   Search supported
    
*   Current location supported
    

Address becomes one of the primary filters for seller discovery.

Seller Discovery Philosophy
===========================

Users should only see sellers who can actually serve them.

Showing irrelevant sellers creates trust issues.

Discovery should consider:

*   Distance
    
*   Availability
    
*   Seller status
    
*   Pricing
    
*   Fulfillment capability
    

The platform should recommend the best seller rather than forcing users to manually evaluate dozens of options.

Checkout Philosophy
===================

Checkout must remain simple even when the backend complexity is high.

The user should feel:

"One checkout"

even if internally:

*   Multiple sellers exist
    
*   Multiple delivery providers exist
    

The complexity is hidden.

Delivery Quote Philosophy
=========================

Users should see delivery transparency.

When multiple sellers are involved:

Each seller may have different delivery options.

The platform should surface:

*   Cost
    
*   ETA
    
*   Recommended option
    

without overwhelming the user.

The platform should guide decisions rather than forcing users to analyze logistics.

Order Experience Philosophy
===========================

Post-purchase experience is extremely important.

The order experience should feel comparable to top consumer apps.

Users should always be able to see:

*   Order status
    
*   Timeline
    
*   Seller details
    
*   Products
    
*   Fees
    
*   Delivery information
    

The order page should be a complete source of truth.

Tracking Philosophy
===================

The platform does not need to build its own logistics tracking system.

If delivery partners provide tracking experiences, we should leverage them.

The goal is:

Reliable tracking experience

rather than

Building custom map infrastructure.

Payment Philosophy
==================

Payments are a utility.

Not a product differentiator.

The goal is:

*   Reliable payment
    
*   Minimal friction
    
*   UPI-first experience
    

The payment experience should feel invisible.

Future AI Layer
===============

Long term, the platform should become increasingly intent-driven.

Rather than:

User → Category → Product

We want:

User Intent → AI Understanding → Seller Network → Fulfillment

The user describes what they need.

The platform figures out:

*   What category it belongs to
    
*   Which sellers can fulfill it
    
*   Whether multiple sellers are required
    
*   Whether delivery is required
    
*   The best fulfillment path
    

ONDC Perspective
================

We later discovered ONDC and researched platforms like DigiHaat.

Important decision:

ONDC is not the MVP.

However:

The product should remain compatible with the idea of becoming an ONDC participant in the future.

We are not building for ONDC initially.

We are building a strong standalone marketplace first.

If successful, ONDC can become an expansion strategy.

Success Metric
==============

The goal is not to build a printing app.

The goal is to build a scalable local commerce orchestration platform that starts with printing, validates demand, and gradually expands into a broader hyperlocal marketplace.

Printing is the beachhead.

Not the destination.