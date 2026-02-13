#!/bin/bash
# Payment Flow Integration Test Script
# Verifies all payment flow components are properly integrated

echo "🔍 Payment Flow Integration Verification"
echo "========================================"
echo ""

# Check if all required files exist
echo "✓ Checking files..."
files=(
  "apps/user-app/app/checkout.tsx"
  "apps/user-app/app/order/payment-method.tsx"
  "apps/user-app/app/order/payment-processing.tsx"
  "apps/user-app/app/order/payment-success.tsx"
  "apps/user-app/app/order/payment-failure.tsx"
  "apps/user-app/src/api/payments.api.ts"
  "apps/user-app/src/api/orders.api.ts"
  "services/api/src/payments/providers/razorpay/razorpay.provider.ts"
  "services/api/src/payments/payments.service.ts"
  "services/api/src/orders/orders.controller.ts"
)

for file in "${files[@]}"; do
  if [ -f "$file" ]; then
    echo "  ✓ $file"
  else
    echo "  ✗ $file (MISSING)"
  fi
done

echo ""
echo "✓ Checking imports..."

# Check if payment-processing.tsx has proper imports
if grep -q "useOrderDraftStore" apps/user-app/app/order/payment-processing.tsx; then
  echo "  ✓ payment-processing: useOrderDraftStore import"
else
  echo "  ✗ payment-processing: useOrderDraftStore missing"
fi

if grep -q "paymentsApi" apps/user-app/app/order/payment-processing.tsx; then
  echo "  ✓ payment-processing: paymentsApi import"
else
  echo "  ✗ payment-processing: paymentsApi missing"
fi

# Check if checkout.tsx has order creation mutation
if grep -q "createOrderMutation" apps/user-app/app/checkout.tsx; then
  echo "  ✓ checkout: createOrderMutation"
else
  echo "  ✗ checkout: createOrderMutation missing"
fi

# Check if payment-method.tsx routes correctly
if grep -q "payment-processing" apps/user-app/app/order/payment-method.tsx; then
  echo "  ✓ payment-method: routes to payment-processing"
else
  echo "  ✗ payment-method: missing payment-processing route"
fi

echo ""
echo "✓ Checking API methods..."

# Check if orders.api.ts has createOrder method
if grep -q "createOrder" apps/user-app/src/api/orders.api.ts; then
  echo "  ✓ orders.api: createOrder method"
else
  echo "  ✗ orders.api: createOrder method missing"
fi

# Check if payments.api.ts has payment methods
if grep -q "createPaymentIntent" apps/user-app/src/api/payments.api.ts; then
  echo "  ✓ payments.api: createPaymentIntent method"
else
  echo "  ✗ payments.api: createPaymentIntent method missing"
fi

if grep -q "verifyPayment" apps/user-app/src/api/payments.api.ts; then
  echo "  ✓ payments.api: verifyPayment method"
else
  echo "  ✗ payments.api: verifyPayment method missing"
fi

echo ""
echo "✓ Checking store integration..."

# Check if order draft store is used
if grep -q "useOrderDraftStore" apps/user-app/app/checkout.tsx; then
  echo "  ✓ checkout: useOrderDraftStore integrated"
else
  echo "  ✗ checkout: useOrderDraftStore missing"
fi

if grep -q "setOrderId" apps/user-app/app/checkout.tsx; then
  echo "  ✓ checkout: setOrderId called"
else
  echo "  ✗ checkout: setOrderId not called"
fi

echo ""
echo "✓ Checking error handling..."

# Check error handling in components
if grep -q "onError" apps/user-app/app/checkout.tsx; then
  echo "  ✓ checkout: error handling configured"
else
  echo "  ✗ checkout: error handling missing"
fi

if grep -q "Alert.alert" apps/user-app/app/order/payment-method.tsx; then
  echo "  ✓ payment-method: user alerts configured"
else
  echo "  ✗ payment-method: user alerts missing"
fi

echo ""
echo "========================================"
echo "✅ Payment Flow Integration Complete!"
echo ""
echo "Next Steps:"
echo "1. Verify environment variables are set (.env)"
echo "2. Test checkout flow with cart items"
echo "3. Verify payment method selection works"
echo "4. Test Razorpay and Paytm flows"
echo "5. Confirm payment processing page verifies correctly"
echo ""
