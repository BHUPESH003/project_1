# Payment Flow Integration Guide

## Overview

The payment flow has been fully integrated with Razorpay and Paytm. Users can now:
1. Add products to cart from shop detail page
2. Proceed to checkout with delivery partner and payment method selection
3. Create an order via API
4. Select payment provider (Razorpay or Paytm)
5. Complete payment and receive confirmation

---

## Complete Payment Flow Architecture

### 1. **Home Page** → **Shop Detail**
- **File**: [apps/user-app/app/(tabs)/home/index.tsx](apps/user-app/app/(tabs)/home/index.tsx)
- **File**: [apps/user-app/app/shop-detail.tsx](apps/user-app/app/shop-detail.tsx)
- **Actions**:
  - User taps quick service category or nearby shop
  - Routes to `/shop-detail` with `shopId` parameter
  - Fetches products from API
  - User adds items to cart
  - User taps "Checkout" button

### 2. **Checkout Page** (NEW ORDER CREATION)
- **File**: [apps/user-app/app/checkout.tsx](apps/user-app/app/checkout.tsx)
- **Actions**:
  - Displays cart items summary
  - User selects delivery partner (Porter/Dunzo)
  - User selects payment method (Prepay/Postpay)
  - **API Call**: Creates order via `ordersApi.createOrder()`
  - Stores `orderId` in `useOrderDraftStore`
  - Routes to `/order/payment-method` with order ID
- **State**:
  - `createOrderMutation` handles order creation with loading state
  - Shows "Creating Order..." while API processes
  - On success: stores orderId and routes to payment selection

### 3. **Payment Method Selection** (RAZORPAY/PAYTM)
- **File**: [apps/user-app/app/order/payment-method.tsx](apps/user-app/app/order/payment-method.tsx)
- **Actions**:
  - Displays two payment options: Razorpay and Paytm
  - User selects preferred provider
  - **API Call**: `paymentsApi.createPaymentIntent(orderId, provider)`
  - Initiates payment gateway integration
- **Razorpay Flow**:
  - Backend generates payment intent with HMAC signature
  - Shows informational alert for Expo Go (development)
  - Option to "Simulate Success" for testing
  - Option to switch to Paytm
  - Routes to `/order/payment-processing`
- **Paytm Flow**:
  - Backend generates UPI payment URL
  - Opens payment URL in browser
  - Routes to `/order/payment-processing`

### 4. **Payment Processing** (VERIFICATION)
- **File**: [apps/user-app/app/order/payment-processing.tsx](apps/user-app/app/order/payment-processing.tsx)
- **Actions**:
  - Shows loading spinner: "Processing payment..."
  - **API Call**: `paymentsApi.verifyPayment()` or `paymentsApi.verifyPaymentStatus()`
  - Polls backend for payment confirmation
  - Retries up to 3 times with 2-second delays
  - On success: routes to `/order/payment-success`
  - On failure: routes to `/order/payment-failure`
- **Payment Verification**:
  - For Razorpay: validates HMAC SHA256 signature
  - For Paytm: validates transaction token
  - Backend updates order status to `PAID`

### 5. **Payment Success** (CONFIRMATION)
- **File**: [apps/user-app/app/order/payment-success.tsx](apps/user-app/app/order/payment-success.tsx)
- **Displays**:
  - Order confirmation
  - Order ID and details
  - Option to track order or return to home

### 6. **Payment Failure** (RETRY)
- **File**: [apps/user-app/app/order/payment-failure.tsx](apps/user-app/app/order/payment-failure.tsx)
- **Displays**:
  - Failure reason
  - Retry button to go back to payment method selection
  - Cancel button to discard order

---

## Backend Integration

### API Endpoints Used

#### 1. Create Order
```
POST /orders
Body: {
  categoryId: string;
  orderPayload: {
    items?: Array<{productId, name, quantity, price}>;
    notes?: string;
  }
}
Response: { order_id: string; status: string }
```

#### 2. Create Payment Intent
```
POST /orders/{id}/create-payment-intent?provider=razorpay
Response: {
  payment_id: string;
  amount: number;
  status: PaymentVerifyStatus;
  payment_intent: {
    orderId: string;
    amount: number;  // in paise
    currency: string;  // "INR"
    gatewayOrderId: string;
    paymentData: {...}  // provider-specific data
  }
}
```

#### 3. Verify Payment
```
POST /orders/{id}/verify-payment
Body: {
  razorpay_payment_id?: string;
  razorpay_order_id?: string;
  razorpay_signature?: string;
}
Response: {
  payment_id: string;
  order_id: string;
  status: 'SUCCESS' | 'FAILED' | 'PENDING' | 'REFUNDED';
  gateway_payment_id?: string;
  paid_at?: string;
  failure_reason?: string;
}
```

---

## Environment Configuration

### Backend (.env)
```env
# Razorpay Configuration
RAZORPAY_KEY_ID=your_key_id
RAZORPAY_KEY_SECRET=your_key_secret
RAZORPAY_WEBHOOK_SECRET=your_webhook_secret

# Paytm Configuration (if using)
PAYTM_MERCHANT_ID=your_merchant_id
PAYTM_MERCHANT_KEY=your_merchant_key
```

### Frontend
No additional environment variables needed. Frontend uses backend APIs for all payment processing.

---

## Testing Scenarios

### Scenario 1: Successful Razorpay Payment (Expo Go)
1. Start from shop detail page
2. Add products to cart
3. Proceed to checkout
4. Select delivery partner and prepay option
5. Complete checkout (creates order)
6. Select Razorpay as payment method
7. Choose "Simulate Success" from alert
8. Verify on payment-processing page (should route to success after 1.5s)

### Scenario 2: Successful Paytm Payment
1. Follow steps 1-6 from Scenario 1
2. Select Paytm instead of Razorpay
3. Pay using UPI app (or test with Paytm test credentials)
4. Return to app (should auto-verify)
5. Verify on payment-processing page

### Scenario 3: Failed Payment
1. Follow checkout flow
2. Simulate payment failure (manual API error injection)
3. Should route to payment-failure page
4. User can retry by tapping "Retry"

### Scenario 4: Production Build (Native Razorpay)
1. Build with EAS: `eas build --platform ios` or `--platform android`
2. Install on device
3. Follow normal checkout flow
4. Razorpay native module automatically available
5. Complete payment with Razorpay SDK

---

## Data Flow Diagram

```
Home Page
    ↓
Shop Detail (fetch products from API)
    ↓ [Add to cart]
    ↓
Checkout Page
    ├─ Select delivery partner
    ├─ Select payment method (prepay/postpay)
    ├─ Fetch total amount
    └─ Create Order API Call
        ↓
    Payment Method Page
        ├─ Select provider (Razorpay/Paytm)
        ├─ Create Payment Intent API Call
        ├─ For Razorpay: Show alert + offer test options
        └─ For Paytm: Open UPI URL
            ↓
        Payment Processing Page
            ├─ Verify Payment API Call
            ├─ Poll backend for status (3 retries)
            └─ Route to Success/Failure page
                ↓
            Success Page (show order ID + confirmation)
            Failure Page (offer retry)
```

---

## State Management

### Cart Store (`useCartStore`)
```typescript
{
  items: CartItem[];  // Products added to cart
  selectedSellerId: string;  // Current shop ID
  selectedShopName: string;  // Shop name
  selectedDeliveryProvider: string;  // 'porter' | 'dunzo'
  paymentMethod: 'prepay' | 'postpay';
  getSubtotal(): number;
  getTotal(): number;
  addItem(item);
  removeItem(id);
  updateQuantity(id, qty);
  setSelectedSeller(id, name);
  setDeliveryProvider(provider);
  setDeliveryFee(fee);
  setPaymentMethod(method);
}
```

### Order Draft Store (`useOrderDraftStore`)
```typescript
{
  orderId: string | null;  // Current order being paid
  deliveryProvider: string | null;
  deliveryFee: number | null;
  deliveryAddressId: string | null;
  setOrderId(id);
  setDeliveryProvider(provider);
  setDeliveryFee(fee);
  setDeliveryAddressId(id);
  reset();
}
```

---

## Payment Provider Classes

### Razorpay Provider
**File**: [services/api/src/payments/providers/razorpay/razorpay.provider.ts](services/api/src/payments/providers/razorpay/razorpay.provider.ts)

Methods:
- `createPayment()` - Creates payment intent with HMAC signature
- `verifyPayment()` - Validates HMAC SHA256 signature
- `parseWebhook()` - Processes incoming payment webhooks
- `verifyWebhookSignature()` - Validates webhook authenticity

### Paytm Provider
**File**: [services/api/src/payments/providers/paytm/paytm.provider.ts](services/api/src/payments/providers/paytm/paytm.provider.ts)

Methods:
- `createPayment()` - Creates UPI payment URL
- `verifyPayment()` - Validates payment token
- `verifyWebhookSignature()` - Validates webhook

---

## Security Considerations

### HMAC Signature Verification
- Razorpay uses HMAC SHA256 for payment verification
- Backend validates signature before confirming payment
- Prevents payment tampering
- Signature includes: payment_id + order_id + razorpay_key_secret

### Webhook Security
- Backend exposes `/webhooks/razorpay` endpoint
- Validates webhook signature before processing
- Handles async payment confirmations
- Implements idempotency for duplicate events

### Frontend Security
- Payment data never stored on frontend
- Order IDs validated before verification calls
- Payment amounts confirmed from backend
- No sensitive keys exposed in client code

---

## Common Issues & Solutions

### Issue 1: "Order Creation Failed"
**Cause**: Missing seller or empty cart
**Solution**: 
- Ensure seller is selected from shop detail
- Add products to cart before checkout
- Check API logs for validation errors

### Issue 2: "Cannot verify payment"
**Cause**: Order doesn't exist or payment status mismatch
**Solution**:
- Confirm order was created successfully
- Check backend logs for payment status
- Verify RAZORPAY_KEY_ID and KEY_SECRET in .env

### Issue 3: Razorpay not available in Expo Go
**Cause**: Native module not built
**Solution**:
- Use Paytm for Expo Go testing
- Create EAS build for native Razorpay
- Use "Simulate Success" option in dev

### Issue 4: Payment verification timeout
**Cause**: Backend webhook not received or slow
**Solution**:
- Ensure webhook endpoint is publicly accessible
- Check RAZORPAY_WEBHOOK_SECRET is configured
- Verify firewall allows inbound webhooks
- Payment processing retries 3 times with 2s delays

---

## Testing Credentials

### Razorpay (Sandbox)
```
Key ID: Your sandbox key
Key Secret: Your sandbox secret
Test Cards:
- 4111 1111 1111 1111 (Success)
- 4000 0000 0000 0002 (Failure)
```

### Paytm (Test Mode)
```
Merchant ID: Your test merchant ID
Merchant Key: Your test merchant key
UPI Test: 9876543210@paytm
```

---

## Next Steps for Full Production

1. **Add 3D Secure / OTP Verification**
   - For card not present transactions
   - Required for PCI compliance

2. **Implement Refunds**
   - Add refund endpoint
   - Handle partial refunds
   - UI for refund status

3. **Add Payment Retry Logic**
   - Automatic retry for failed payments
   - Exponential backoff
   - User notifications

4. **Webhook Event Processing**
   - Handle payment.authorized
   - Handle payment.failed
   - Handle payment.captured
   - Email notifications

5. **Analytics**
   - Track payment success rate
   - Monitor conversion funnel
   - Error logging and alerting

6. **Invoices & Receipts**
   - Generate PDF invoices
   - Email receipts
   - In-app invoice view

---

## File Summary

| File | Type | Purpose |
|------|------|---------|
| checkout.tsx | Screen | Cart summary, delivery, order creation |
| payment-method.tsx | Screen | Payment provider selection |
| payment-processing.tsx | Screen | Payment verification polling |
| payment-success.tsx | Screen | Order confirmation |
| payment-failure.tsx | Screen | Failed payment handling |
| payments.api.ts | API Client | Razorpay/Paytm API methods |
| orders.api.ts | API Client | Order creation and management |
| razorpay.provider.ts | Provider | Razorpay integration |
| payments.service.ts | Service | Payment processing logic |
| orders.service.ts | Service | Order state machine |
| orders.controller.ts | Controller | Payment endpoints |

---

## Verification Checklist

- [x] Checkout page creates orders via API
- [x] Order ID stored in draft store
- [x] Payment method selection UI working
- [x] Razorpay payment intent creation working
- [x] Paytm UPI flow working
- [x] Payment processing shows loading state
- [x] Payment verification API call configured
- [x] Success/Failure pages implemented
- [x] Error handling and alerts configured
- [x] All imports and types correct
- [ ] Live Razorpay credentials tested
- [ ] E2E payment flow tested
- [ ] Webhook processing verified
- [ ] Production build tested

---

## Support & References

- **Razorpay Docs**: https://razorpay.com/docs/
- **Paytm Docs**: https://business.paytm.com/developers
- **React Native**: https://reactnative.dev/
- **Expo Router**: https://docs.expo.dev/routing/introduction/
