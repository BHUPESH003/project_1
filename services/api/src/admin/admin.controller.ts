import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Body,
  Query,
  UseGuards,
  Request,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { AdminService } from './admin.service';
import { AdminAnalyticsService } from './analytics/admin-analytics.service';
import { BannersService } from '@/banners/banners.service';
import { JwtAuthGuard, RolesGuard, Roles } from '@/common/guards';
import { UserRole } from '@repo/types';
import { GetOrdersDto } from './dto/get-orders.dto';
import { ReassignSellerDto } from './dto/reassign-seller.dto';
import { ReassignDeliveryDto } from './dto/reassign-delivery.dto';
import { CancelOrderDto } from './dto/cancel-order.dto';
import { CreateBannerDto, UpdateBannerDto } from './dto/create-banner.dto';
import { GetSellersDto } from './dto/get-sellers.dto';
import { UpdateAdminSellerDto } from './dto/update-admin-seller.dto';
import { GetOrdersAnalyticsDto } from './analytics/dto/get-orders-analytics.dto';
import { GetSellersAnalyticsDto } from './analytics/dto/get-sellers-analytics.dto';
import { CreateCategoryDto } from './dto/create-category.dto';
import { UpdateCategoryDto } from './dto/update-category.dto';
import { GetPayoutsDto } from './dto/get-payouts.dto';
import { ProcessPayoutDto } from './dto/process-payout.dto';
import { RejectPayoutDto } from './dto/reject-payout.dto';
import { SendNotificationDto, NotificationTarget } from './dto/send-notification.dto';
import { NotificationsService } from '@/notifications/notifications.service';
import { PrismaService } from '@/prisma/prisma.service';

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
@ApiTags('Admin')
@Controller('admin')
export class AdminController {
  constructor(
    private readonly adminService: AdminService,
    private readonly analyticsService: AdminAnalyticsService,
    private readonly bannersService: BannersService,
    private readonly notificationsService: NotificationsService,
    private readonly prisma: PrismaService,
  ) {}

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
   * GET /v1/admin/orders/:id
   * Full order detail for the admin order-detail screen
   * Requires ADMIN role
   */
  @Get('orders/:id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get full order detail' })
  getOrderById(@Param('id') id: string) {
    return this.adminService.getOrderById(id);
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

  /** GET /admin/banners – list all banners (admin) */
  @Get('banners')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'List all banners' })
  getBanners() {
    return this.bannersService.findAll();
  }

  /** GET /admin/banners/:id */
  @Get('banners/:id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get banner by id' })
  getBanner(@Param('id') id: string) {
    return this.bannersService.findOne(id);
  }

  /** POST /admin/banners – create banner */
  @Post('banners')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create banner' })
  createBanner(@Body() dto: CreateBannerDto) {
    return this.bannersService.create({
      ...dto,
      startAt: dto.startAt ? new Date(dto.startAt) : undefined,
      endAt: dto.endAt ? new Date(dto.endAt) : undefined,
    });
  }

  /** PATCH /admin/banners/:id */
  @Patch('banners/:id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update banner' })
  updateBanner(@Param('id') id: string, @Body() dto: UpdateBannerDto) {
    return this.bannersService.update(id, {
      ...dto,
      startAt: dto.startAt ? new Date(dto.startAt) : undefined,
      endAt: dto.endAt ? new Date(dto.endAt) : undefined,
    });
  }

  /** DELETE /admin/banners/:id */
  @Delete('banners/:id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Delete banner' })
  deleteBanner(@Param('id') id: string) {
    return this.bannersService.remove(id);
  }

  // ─── Phase 3.3: Admin Seller Management ─────────────────────────────────

  @Get('sellers')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'List all sellers with optional filters' })
  getSellers(@Query() query: GetSellersDto) {
    return this.adminService.getSellers(query);
  }

  @Get('sellers/:id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get seller detail with order stats' })
  getSellerById(@Param('id') id: string) {
    return this.adminService.getSellerById(id);
  }

  @Patch('sellers/:id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Update seller (status, isTrending, name, address)',
  })
  updateSeller(
    @Param('id') id: string,
    @Body() dto: UpdateAdminSellerDto,
    @Request() req: { user: { id: string } },
  ) {
    return this.adminService.updateSellerById(id, dto, req.user.id);
  }

  @Post('sellers/:id/verify')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Mark seller as verified (onboarded)' })
  verifySeller(
    @Param('id') id: string,
    @Request() req: { user: { id: string } },
  ) {
    return this.adminService.verifySeller(id, req.user.id);
  }

  @Post('sellers/:id/unverify')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Remove seller verification' })
  unverifySeller(
    @Param('id') id: string,
    @Request() req: { user: { id: string } },
  ) {
    return this.adminService.unverifySeller(id, req.user.id);
  }

  @Post('sellers/:id/suspend')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Suspend seller (sets OFFLINE, blocks status changes)',
  })
  suspendSeller(
    @Param('id') id: string,
    @Request() req: { user: { id: string } },
  ) {
    return this.adminService.suspendSeller(id, req.user.id);
  }

  @Post('sellers/:id/unsuspend')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Lift seller suspension' })
  unsuspendSeller(
    @Param('id') id: string,
    @Request() req: { user: { id: string } },
  ) {
    return this.adminService.unsuspendSeller(id, req.user.id);
  }

  // ─── Phase 7.1: Analytics ─────────────────────────────────────────────────

  @Get('analytics/overview')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Platform overview — order counts, revenue, active sellers/users',
  })
  getAnalyticsOverview() {
    return this.analyticsService.getOverview();
  }

  @Get('analytics/orders')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Order trends, AOV, cancellation rate, seller rejection rate',
  })
  getOrdersAnalytics(@Query() query: GetOrdersAnalyticsDto) {
    return this.analyticsService.getOrdersAnalytics(query);
  }

  @Get('analytics/sellers')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({
    summary:
      'Top sellers by revenue, order count, fulfillment time, acceptance rate',
  })
  getSellersAnalytics(@Query() query: GetSellersAnalyticsDto) {
    return this.analyticsService.getSellersAnalytics(query);
  }

  // ─── Phase 7.2: Category Management ──────────────────────────────────────

  @Post('categories')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create a new category' })
  createCategory(@Body() dto: CreateCategoryDto) {
    return this.adminService.createCategory(dto);
  }

  @Patch('categories/:id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Update category (name, status, icon, displayOrder)',
  })
  updateCategory(@Param('id') id: string, @Body() dto: UpdateCategoryDto) {
    return this.adminService.updateCategory(id, dto);
  }

  // ─── Admin Payout Management ─────────────────────────────────────────────

  @Get('payouts')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'List seller payout (withdrawal) requests' })
  getPayouts(@Query() query: GetPayoutsDto) {
    return this.adminService.getPayouts(query);
  }

  @Post('payouts/:id/process')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Mark a payout request as processed (completed)' })
  processPayout(
    @Param('id') id: string,
    @Body() dto: ProcessPayoutDto,
    @Request() req: { user: { id: string } },
  ) {
    return this.adminService.processPayout(id, dto, req.user.id);
  }

  @Post('payouts/:id/reject')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Reject a payout request with a reason' })
  rejectPayout(
    @Param('id') id: string,
    @Body() dto: RejectPayoutDto,
    @Request() req: { user: { id: string } },
  ) {
    return this.adminService.rejectPayout(id, dto, req.user.id);
  }

  // ─── Notifications ────────────────────────────────────────────────────────

  /**
   * POST /admin/notifications/push
   * Send a push/in-app notification to a single user or broadcast to all users.
   */
  @Post('notifications/push')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Send notification to a user or broadcast to all users' })
  async pushNotification(@Body() dto: SendNotificationDto) {
    if (dto.target === NotificationTarget.USER) {
      if (!dto.userId) {
        return { sent: 0, error: 'userId is required for target=user' };
      }
      await this.notificationsService.persistNotification(
        dto.userId,
        dto.type,
        dto.title,
        dto.body,
      );
      await this.notificationsService.sendNotificationIntent({
        type: 'PUSH',
        category: dto.type as 'ORDER_UPDATE' | 'MARKETING' | 'SYSTEM',
        userId: dto.userId,
        title: dto.title,
        body: dto.body,
      });
      return { sent: 1, target: 'user', userId: dto.userId };
    }

    // Broadcast — fan out to all regular users
    const users = await this.prisma.prisma.user.findMany({
      where: { role: 'USER' },
      select: { id: true },
    });

    await Promise.allSettled(
      users.map(async (u: { id: string }) => {
        await this.notificationsService.persistNotification(
          u.id,
          dto.type,
          dto.title,
          dto.body,
        );
        await this.notificationsService.sendNotificationIntent({
          type: 'PUSH',
          category: dto.type as 'ORDER_UPDATE' | 'MARKETING' | 'SYSTEM',
          userId: u.id,
          title: dto.title,
          body: dto.body,
        });
      }),
    );

    return { sent: users.length, target: 'broadcast' };
  }
}

/**
 * MVP CHECK:
 * Q: Does every remaining endpoint directly support the MVP order flow or ops safety?
 * A: YES
 *    - All endpoints are for operational oversight and crisis management
 *    - Enable manual intervention when automation fails
 *    - Critical for MVP success rate and customer satisfaction
 */
