import {
  Controller,
  Get,
  Post,
  Param,
  Body,
  Query,
  UseGuards,
  Request,
} from '@nestjs/common';
import { AdminService } from './admin.service';
import { JwtAuthGuard, RolesGuard, Roles } from '@/common/guards';
import { UserRole } from '@repo/types';
import { GetOrdersDto } from './dto/get-orders.dto';
import { ReassignSellerDto } from './dto/reassign-seller.dto';
import { ReassignDeliveryDto } from './dto/reassign-delivery.dto';
import { CancelOrderDto } from './dto/cancel-order.dto';

/**
 * Admin Controller - MVP Scope
 *
 * API Contract v1 endpoints:
 * - GET /v1/admin/orders (view all orders)
 * - POST /v1/admin/orders/:id/reassign-seller (manual seller reassignment)
 * - POST /v1/admin/orders/:id/reassign-delivery (manual delivery reassignment)
 * - POST /v1/admin/orders/:id/cancel (cancel/refund order)
 *
 * Purpose:
 * - Operational oversight
 * - Manual intervention for failed states
 * - Crisis management
 *
 * Removed:
 * - getDashboard() - Not in API contract, analytics not in MVP
 * - getStatistics() - Not in API contract, analytics not in MVP
 * - getUsers() - Too broad, privacy concern, not needed for ops
 * - updateUser() - User management not in admin scope for MVP
 */
@Controller('admin')
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  /**
   * GET /v1/admin/orders
   * View all orders with filters
   * Purpose: Operational oversight
   * Requires ADMIN role
   */
  @Get('orders')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  getOrders(
    @Query() query: GetOrdersDto,
    @Request() req: { user: { id: string } },
  ) {
    return this.adminService.getOrders(query, req.user.id);
  }

  /**
   * POST /v1/admin/orders/:id/reassign-seller
   * Manually reassign seller to order
   * Purpose: Handle seller rejection or unavailability
   * Payload: { seller_id }
   * Requires ADMIN role
   */
  @Post('orders/:id/reassign-seller')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  reassignSeller(
    @Param('id') id: string,
    @Body() reassignDto: ReassignSellerDto,
    @Request() req: { user: { id: string } },
  ) {
    return this.adminService.reassignSeller(id, reassignDto, req.user.id);
  }

  /**
   * POST /v1/admin/orders/:id/reassign-delivery
   * Manually reassign delivery partner
   * Purpose: Handle delivery failures
   * Payload: { provider, tracking_id }
   * Requires ADMIN role
   */
  @Post('orders/:id/reassign-delivery')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  reassignDelivery(
    @Param('id') id: string,
    @Body() deliveryDto: ReassignDeliveryDto,
    @Request() req: { user: { id: string } },
  ) {
    return this.adminService.reassignDelivery(id, deliveryDto, req.user.id);
  }

  /**
   * POST /v1/admin/orders/:id/cancel
   * Cancel order and process refund
   * Purpose: Handle escalations, quality issues
   * Payload: { reason, refund_amount }
   * Requires ADMIN role
   */
  @Post('orders/:id/cancel')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  cancelOrder(
    @Param('id') id: string,
    @Body() cancelDto: CancelOrderDto,
    @Request() req: { user: { id: string } },
  ) {
    return this.adminService.cancelOrder(id, cancelDto, req.user.id);
  }

  // ❌ REMOVED: getDashboard() - Analytics not in MVP
  // ❌ REMOVED: getUsers() - Not in API contract, too broad
  // ❌ REMOVED: getStatistics() - Analytics not in MVP
  // ❌ REMOVED: updateUser() - User management not admin responsibility in MVP
}

/**
 * MVP CHECK:
 * Q: Does every remaining endpoint directly support the MVP order flow or ops safety?
 * A: YES
 *    - All endpoints are for operational oversight and crisis management
 *    - Enable manual intervention when automation fails
 *    - Critical for MVP success rate and customer satisfaction
 */
