import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  UseGuards,
  Request,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
  ApiQuery,
} from '@nestjs/swagger';
import { SellersService } from './sellers.service';
import { JwtAuthGuard, RolesGuard, Roles } from '@/common/guards';
import { UserRole } from '@repo/types';
import { SetStatusDto } from './dto/set-status.dto';
import { FindAvailableSellersDto } from './dto/find-available-sellers.dto';

/**
 * Sellers Controller - MVP Scope
 *
 * API Contract v1 endpoints:
 * - GET /v1/sellers?category=X&lat=Y&lng=Z (User App - discover sellers)
 * - POST /v1/seller/status (Seller App - set ONLINE/OFFLINE)
 * - GET /v1/seller/orders (Seller App - handled in orders module)
 *
 * Removed:
 * - create() - Sellers onboarded manually, not via API
 * - findAll() - Too broad, violates context filtering
 * - update() - Generic update too dangerous, only status toggle allowed
 * - remove() - No deletion in MVP
 *
 * Note: Seller order management endpoints are in orders module under /v1/seller/orders/*
 */
@ApiTags('Sellers')
@Controller('sellers')
export class SellersController {
  constructor(private readonly sellersService: SellersService) {}

  /**
   * GET /v1/sellers?category=printing&lat=28.45&lng=77.02
   * List available sellers for user app
   * Returns only ONLINE sellers in requested category
   * Public endpoint (no auth required for discovery)
   */
  @Get()
  @ApiOperation({ summary: 'Find available sellers', description: 'Returns list of ONLINE sellers. Can be filtered by category and location. Public endpoint, no authentication required.' })
  @ApiQuery({ name: 'category', required: false, description: 'Category ID to filter sellers', example: 'cat-printing-123' })
  @ApiQuery({ name: 'lat', required: false, description: 'Latitude for location-based filtering', example: 28.6139 })
  @ApiQuery({ name: 'lng', required: false, description: 'Longitude for location-based filtering', example: 77.2090 })
  @ApiResponse({ status: 200, description: 'List of available sellers retrieved successfully' })
  findAvailableSellers(@Query() query: FindAvailableSellersDto) {
    return this.sellersService.findAvailableSellers(query);
  }

  /**
   * GET /v1/sellers/:id
   * Get seller profile (for display in order flow)
   * Public endpoint
   */
  @Get(':id')
  @ApiOperation({ summary: 'Get seller profile', description: 'Retrieves seller profile details. Public endpoint, no authentication required.' })
  @ApiParam({ name: 'id', description: 'Seller ID', example: 'seller-123' })
  @ApiResponse({ status: 200, description: 'Seller profile retrieved successfully' })
  @ApiResponse({ status: 404, description: 'Seller not found' })
  findOne(@Param('id') id: string) {
    return this.sellersService.findOne(id);
  }

  /**
   * POST /v1/seller/status
   * Seller sets their availability status
   * Payload: { status: "ONLINE" | "OFFLINE" }
   * Requires authentication and SELLER role
   *
   * NOTE: This is a Seller App endpoint, should be under /v1/seller prefix
   * Consider moving to dedicated seller-app controller in future
   */
  @Post('status')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.SELLER)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Set seller status', description: 'Updates the authenticated seller\'s availability status (ONLINE/OFFLINE). Requires SELLER role.' })
  @ApiResponse({ status: 200, description: 'Seller status updated successfully' })
  @ApiResponse({ status: 400, description: 'Invalid status value' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  setStatus(
    @Body() statusDto: SetStatusDto,
    @Request() req: { user: { id: string } },
  ) {
    // user is set by JwtAuthGuard on request object
    return this.sellersService.setStatus(req.user.id, statusDto);
  }

  // ❌ REMOVED: create() - Manual seller onboarding only
  // ❌ REMOVED: findAll() - Violates context filtering, use findAvailableSellers with filters
  // ❌ REMOVED: update() - Only status changes allowed via setStatus()
  // ❌ REMOVED: remove() - No deletion in MVP
}

/**
 * MVP CHECK:
 * Q: Does every remaining endpoint directly support the MVP order flow or ops safety?
 * A: YES
 *    - findAvailableSellers() - Critical for user discovering shops
 *    - findOne() - Needed for order flow seller display
 *    - setStatus() - Critical for seller availability management
 */
