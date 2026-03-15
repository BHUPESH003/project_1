import { Headers, 
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
import {
  JwtAuthGuard,
  OptionalJwtAuthGuard,
  RolesGuard,
  Roles,
} from '@/common/guards';
import { UserRole } from '@repo/types';
import { SetStatusDto } from './dto/set-status.dto';
import { FindAvailableSellersDto } from './dto/find-available-sellers.dto';
import { GetSellerQueryDto } from './dto/get-seller.dto';
import { SellerProductsQueryDto } from './dto/seller-products-query.dto';

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
  @UseGuards(OptionalJwtAuthGuard)
  @ApiOperation({
    summary: 'Find available sellers',
    description:
      'Returns paginated list of ONLINE sellers with imageUrl, rating, categories. Send Bearer token for isFavorited.',
  })
  @ApiQuery({ name: 'category', required: false })
  @ApiQuery({ name: 'lat', required: false })
  @ApiQuery({ name: 'lng', required: false })
  @ApiQuery({ name: 'maxDistanceKm', required: false })
  @ApiQuery({
    name: 'limit',
    required: false,
    description: 'Page size (default 20)',
  })
  @ApiQuery({
    name: 'offset',
    required: false,
    description: 'Offset for pagination',
  })
  @ApiResponse({ status: 200, description: 'List of sellers with pagination' })
  findAvailableSellers(
    @Query() query: FindAvailableSellersDto,
    @Request() req: { user?: { id: string } },
  ) {
    return this.sellersService.findAvailableSellers(query, req.user?.id);
  }

  /**
   * GET /v1/sellers/new
   * Find newly added sellers
   */
  @Get('new')
  @UseGuards(OptionalJwtAuthGuard)
  @ApiOperation({
    summary: 'Find newly added sellers',
    description: 'Returns list of recently added sellers (ONLINE), sorted by newest first.',
  })
  @ApiQuery({ name: 'category', required: false })
  @ApiQuery({ name: 'lat', required: false })
  @ApiQuery({ name: 'lng', required: false })
  @ApiResponse({ status: 200, description: 'List of sellers' })
  findNewlyAddedSellers(
    @Query() query: FindAvailableSellersDto,
    @Request() req: { user?: { id: string } },
  ) {
    return this.sellersService.findNewlyAddedSellers(query, req.user?.id);
  }

  /**
   * GET /v1/sellers/trending
   * Find trending/advertised sellers
   */
  @Get('trending')
  @UseGuards(OptionalJwtAuthGuard)
  @ApiOperation({
    summary: 'Find trending/advertised sellers',
    description: 'Returns list of trending/advertised sellers (ONLINE).',
  })
  @ApiQuery({ name: 'category', required: false })
  @ApiQuery({ name: 'lat', required: false })
  @ApiQuery({ name: 'lng', required: false })
  @ApiResponse({ status: 200, description: 'List of sellers' })
  findTrendingSellers(
    @Query() query: FindAvailableSellersDto,
    @Request() req: { user?: { id: string } },
  ) {
    return this.sellersService.findTrendingSellers(query, req.user?.id);
  }

  /**
   * GET /v1/sellers/:id/products
   * Get all products for a specific seller
   * Public endpoint
   */
  
  @Get(':id/products/diff')
  @ApiOperation({ summary: 'Get partial catalog updates based on timestamp' })
  async getProductsDiff(
    @Param('id') id: string,
    @Query('since') sinceStr: string,
    @Headers('x-user-id') userId?: string,
  ) {
    const sinceDate = new Date(sinceStr);
    if (isNaN(sinceDate.getTime())) {
      throw new Error('Invalid since timestamp');
    }
    
    // Pass differential info down to fetch products updated/created after Date
    const diffResults = await this.sellersService.getSellerProductsDifferential(id, sinceDate);
    
    return {
      success: true,
      message: 'Differential loaded successfully',
      data: diffResults,
      differential_sync: true
    };
  }

  @Get(':id/products')
  @UseGuards(OptionalJwtAuthGuard)
  @ApiOperation({
    summary: 'Get seller products',
    description:
      'Seller catalog products with pagination and filter chips. Send Bearer token to get wishlist/notify flags.',
  })
  @ApiParam({
    name: 'id',
    description: 'Seller ID',
    example: 'clh9qh3j90001q6qz6z8z8z8z',
  })
  @ApiResponse({
    status: 200,
    description: 'Products retrieved successfully',
    example: [
      {
        id: 'prod-123',
        sellerId: 'clh9qh3j90001q6qz6z8z8z8z',
        name: 'B&W Document Print',
        description: 'Standard 80gsm A4 paper',
        category: 'Printing Services',
        price: 0.5,
        image: 'https://images.unsplash.com/...',
        inStock: true,
      },
    ],
  })
  @ApiResponse({ status: 404, description: 'Seller not found' })
  getSellerProducts(
    @Param('id') id: string,
    @Query() query: SellerProductsQueryDto,
    @Request() req: { user?: { id: string } },
  ) {
    return this.sellersService.getSellerProducts(id, query, req.user?.id);
  }

  /**
   * GET /v1/sellers/:id
   * Get seller profile (for display in order flow)
   * Optionally accepts lat/lng query params to calculate distance
   * Public endpoint
   */
  @Get(':id')
  @ApiOperation({
    summary: 'Get seller profile',
    description:
      'Retrieves seller profile details including shop information, location, categories, rating, discount rules. Optionally accepts lat/lng to calculate distance. Public endpoint, no authentication required.',
  })
  @ApiParam({
    name: 'id',
    description: 'Seller ID',
    example: 'clh9qh3j90001q6qz6z8z8z8z',
  })
  @ApiQuery({
    name: 'lat',
    required: false,
    description: 'User latitude for distance calculation',
  })
  @ApiQuery({
    name: 'lng',
    required: false,
    description: 'User longitude for distance calculation',
  })
  @ApiResponse({
    status: 200,
    description: 'Seller profile retrieved successfully',
    example: {
      id: 'clh9qh3j90001q6qz6z8z8z8z',
      shopName: 'Fast Print Shop',
      address: '123 Main Street, Delhi',
      description: 'Professional document printing & binding services',
      latitude: '28.6139',
      longitude: '77.209',
      pricePerPage: '2.00',
      prepTimeMinutes: 30,
      status: 'ONLINE',
      rating: 4.9,
      discountThreshold: 50,
      discountPercent: 10.0,
      distance_km: 0.5,
      categories: [{ id: 'printing', name: 'Printing' }],
    },
  })
  @ApiResponse({ status: 404, description: 'Seller not found' })
  findOne(@Param('id') id: string, @Query() query: GetSellerQueryDto) {
    return this.sellersService.findOne(id, query.lat, query.lng);
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
  @ApiOperation({
    summary: 'Set seller status',
    description:
      "Updates the authenticated seller's availability status (ONLINE/OFFLINE). Requires SELLER role.",
  })
  @ApiResponse({
    status: 200,
    description: 'Seller status updated successfully',
  })
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
