import { Injectable } from '@nestjs/common';

@Injectable()
export class OrdersService {
  // USER APP METHODS

  create(createOrderDto: Record<string, unknown>) {
    // TODO: Create draft order
    // Expected payload: { category, order_payload: {...} }
    // State: CREATED
    return { message: 'Create order - to be implemented' };
  }

  findOne(id: string) {
    // TODO: Get order by ID for tracking
    return { message: `Find order #${id} - to be implemented` };
  }

  selectSeller(id: string, sellerDto: Record<string, unknown>) {
    // TODO: Assign seller to order
    // Transition: CREATED → SELLER_SELECTED
    return { message: `Select seller for order #${id} - to be implemented` };
  }

  getDeliveryQuote(id: string, locationDto: Record<string, unknown>) {
    // TODO: Calculate delivery quote
    // Expected payload: { drop_location: { lat, lng } }
    return { message: `Get delivery quote for order #${id} - to be implemented` };
  }

  confirmOrder(id: string, paymentDto: Record<string, unknown>) {
    // TODO: Confirm and process payment
    // Transition: SELLER_SELECTED → PAID
    return { message: `Confirm order #${id} - to be implemented` };
  }

  // SELLER APP METHODS

  getSellerOrders() {
    // TODO: List orders for authenticated seller
    // Filter by status query param
    return { message: 'Get seller orders - to be implemented', data: [] };
  }

  acceptOrder(id: string) {
    // TODO: Seller accepts order
    // Transition: PAID → SELLER_ACCEPTED
    return { message: `Accept order #${id} - to be implemented` };
  }

  rejectOrder(id: string, rejectDto: Record<string, unknown>) {
    // TODO: Seller rejects order with reason
    // Transition: PAID → SELLER_REJECTED
    return { message: `Reject order #${id} - to be implemented` };
  }

  markReady(id: string) {
    // TODO: Mark order ready for pickup
    // Transition: PREPARING → READY_FOR_PICKUP
    return { message: `Mark order #${id} ready - to be implemented` };
  }
}
