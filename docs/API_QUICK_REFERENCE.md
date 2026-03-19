# Controller Quick Reference - MVP API Contract

## 🔐 Authentication (`/v1/auth`)
```typescript
POST /v1/auth/request-otp     // Send OTP
POST /v1/auth/verify-otp      // Verify & get JWT
```

## 📱 User App Endpoints

### Categories
```typescript
GET /v1/categories            // List all (ACTIVE/COMING_SOON)
```

### Shop Discovery
```typescript
GET /v1/sellers?category=X&lat=Y&lng=Z  // List ONLINE sellers
GET /v1/sellers/:id                      // Get seller profile
```

### Order Flow (User)
```typescript
POST /v1/orders                         // Create draft (CREATED)
POST /v1/orders/:id/select-seller       // Assign seller (→ SELLER_SELECTED)
POST /v1/orders/:id/delivery-quote      // Get delivery pricing
POST /v1/orders/:id/confirm             // Confirm & pay (→ PAID)
GET  /v1/orders/:id                     // Track order
```

## 🏪 Seller App Endpoints

### Availability
```typescript
POST /v1/seller/status        // Toggle ONLINE/OFFLINE
```

### Order Management
```typescript
GET  /v1/seller/orders?status=PENDING     // Incoming orders
POST /v1/seller/orders/:id/accept         // Accept (PAID → SELLER_ACCEPTED)
POST /v1/seller/orders/:id/reject         // Reject (→ SELLER_REJECTED)
POST /v1/seller/orders/:id/ready          // Mark ready (→ READY_FOR_PICKUP)
```

## 🛡️ Admin Endpoints

### Order Oversight
```typescript
GET  /v1/admin/orders                           // View all orders
POST /v1/admin/orders/:id/reassign-seller       // Manual reassignment
POST /v1/admin/orders/:id/reassign-delivery     // Manual delivery change
POST /v1/admin/orders/:id/cancel                // Cancel/refund
```

## 🔧 Internal Endpoints (Not in Public API)

### Delivery
```typescript
POST /v1/internal/delivery/assign       // Assign delivery partner
POST /v1/internal/delivery/webhook      // Delivery status updates
```

### Payments
```typescript
POST /v1/internal/payments/webhook      // Payment gateway webhook
POST /v1/internal/payments/verify       // Verify payment
```

### Files
```typescript
POST /v1/internal/files/presigned-url   // Get S3 upload URL
POST /v1/internal/files/validate        // Validate file
```

## 📊 Order State Machine

```
CREATED 
  ↓ (user selects seller)
SELLER_SELECTED 
  ↓ (user confirms & pays)
PAID 
  ↓ (seller accepts)
SELLER_ACCEPTED 
  ↓ (seller prepares)
PREPARING 
  ↓ (seller marks ready)
READY_FOR_PICKUP 
  ↓ (delivery assigned & picks up)
PICKED_UP 
  ↓ (delivered)
DELIVERED ✅
```

**Failure States:**
- SELLER_REJECTED (seller rejects)
- DELIVERY_FAILED (delivery issues)
- USER_CANCELLED (before pickup)

## 🚫 What's NOT in MVP

- ❌ User profile CRUD
- ❌ Generic order updates
- ❌ Order deletion
- ❌ Seller CRUD
- ❌ Category management
- ❌ Analytics/dashboards
- ❌ Ratings/reviews
- ❌ Notification inbox REST API
- ❌ Public file CRUD

## ⚠️ Key Architectural Decisions

1. **No Generic CRUD** - Only command-style endpoints
2. **State Machine Enforced** - No arbitrary order mutations
3. **Role-Based Filtering** - No list-all without context
4. **Internal Services** - Delivery, payments, files not public REST
5. **Event-Driven Notifications** - Not REST API
6. **Users Auto-Created** - No user registration endpoint

## 🎯 Implementation Next Steps

1. Add DTOs with class-validator
2. Add authentication guards (@UseGuards(JwtAuthGuard))
3. Add role guards (@Roles('USER', 'SELLER', 'ADMIN'))
4. Implement state machine validation
5. Add database integration
6. Connect payment gateway
7. Connect delivery aggregator APIs
8. Set up notification services

---

**Remember:** If an endpoint isn't listed here, it shouldn't exist in your controller. Refer to `CONTROLLER_AUDIT_REPORT.md` for detailed rationale.
