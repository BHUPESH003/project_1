/**
 * Multi-Cart Checkout Service
 * 
 * Orchestrates the complete checkout flow for multiple sellers:
 * 1. Validate cart state
 * 2. Create orders for all sellers
 * 3. Fetch delivery quotes for each seller
 * 4. User selects delivery provider per seller
 * 5. Confirm all orders with payment
 */

import { multiCartOrdersApi, CreateMultiOrdersPayload } from '@/api/multiCartOrders.api';
import { ordersApi } from '@/api/orders.api';
import { useMultiCartStore } from '@/store/multiCartStore';

export class MultiCartCheckoutService {
  /**
   * Prepare multi-order payload from cart store
   */
  static prepareMultiOrdersPayload(
    deliveryAddress: { latitude: number; longitude: number; address: string },
  ): CreateMultiOrdersPayload {
    const state = useMultiCartStore.getState();
    const { carts } = state;

    const orders = Object.entries(carts)
      .filter(([_, cart]) => cart.items.length > 0)
      .map(([sellerId, cart]) => ({
        sellerId,
        sellerName: cart.sellerName,
        items: cart.items.map((item) => ({
          productId: item.productId,
          name: item.name,
          quantity: item.quantity,
          price: item.price,
        })),
        notes: '',
      }));

    return {
      orders,
      deliveryAddress,
      paymentMethod: 'UPI',
    };
  }

  /**
   * Create all orders at once
   * Returns array of created orders with IDs
   */
  static async createAllOrders(
    deliveryAddress: { latitude: number; longitude: number; address: string },
  ) {
    const payload = this.prepareMultiOrdersPayload(deliveryAddress);

    console.log('Creating multiple orders...', payload);

    const response = await multiCartOrdersApi.createMultipleOrders(payload);

    if (!response.success) {
      throw new Error(response.message || 'Failed to create orders');
    }

    if (response.failedOrders.length > 0) {
      console.warn('Some orders failed:', response.failedOrders);
    }

    return response.successfulOrders;
  }

  /**
   * Fetch delivery quotes for all created orders
   */
  static async getDeliveryQuotes(
    orderIds: string[],
    deliveryAddress: { latitude: number; longitude: number; address: string },
  ) {
    const response = await multiCartOrdersApi.getMultipleDeliveryQuotes({
      orderIds,
      deliveryAddress,
    });

    return response.orders;
  }

  /**
   * Confirm all orders with selected delivery providers
   */
  static async confirmAllOrders(
    deliverySelections: Array<{
      orderId: string;
      sellerId: string;
      deliveryPartner: string;
      deliveryFee: number;
    }>,
    paymentMethod: 'UPI' | 'CASH' | 'CARD' = 'UPI',
  ) {
    const response = await multiCartOrdersApi.confirmMultipleOrders({
      deliveryConfirmations: deliverySelections,
      paymentMethod,
    });

    if (!response.success) {
      throw new Error(
        `Failed to confirm orders: ${
          response.failedOrders.map((o) => o.error).join(', ') || 'Unknown error'
        }`,
      );
    }

    return response;
  }

  /**
   * Track multiple orders
   */
  static async trackMultipleOrders(orderIds: string[]) {
    return await multiCartOrdersApi.getMultipleOrdersStatus(orderIds);
  }

  /**
   * Cancel orders before confirmation
   */
  static async cancelOrders(orderIds: string[]) {
    return await multiCartOrdersApi.cancelOrders(orderIds);
  }

  /**
   * Clear cart after successful checkout
   */
  static clearCheckoutCarts() {
    const state = useMultiCartStore.getState();
    const selectedSellers = state.selectedForCheckout;

    selectedSellers.forEach((sellerId) => {
      useMultiCartStore.getState().clearCart(sellerId);
    });

    // Clear selections
    useMultiCartStore.setState({
      selectedForCheckout: new Set(),
      sharedDeliveryAddress: null,
      checkoutSelections: {},
    });
  }
}
