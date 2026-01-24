import { Controller, Get, Post, Body, Param } from '@nestjs/common';
import { SellersService } from './sellers.service';

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
@Controller('sellers')
export class SellersController {
  constructor(private readonly sellersService: SellersService) {}

  /**
   * GET /v1/sellers?category=printing&lat=28.45&lng=77.02
   * List available sellers for user app
   * Returns only ONLINE sellers in requested category
   */
  @Get()
  findAvailableSellers(
    // TODO: Use proper query DTO with @Query decorator
    // Expected params: category, lat, lng
  ) {
    return this.sellersService.findAvailableSellers();
  }

  /**
   * GET /v1/sellers/:id
   * Get seller profile (for display in order flow)
   */
  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.sellersService.findOne(id);
  }

  /**
   * POST /v1/seller/status
   * Seller sets their availability status
   * Payload: { status: "ONLINE" | "OFFLINE" }
   * 
   * NOTE: This is a Seller App endpoint, should be under /v1/seller prefix
   * Consider moving to dedicated seller-app controller in future
   */
  @Post('status')
  setStatus(@Body() statusDto: Record<string, unknown>) {
    return this.sellersService.setStatus(statusDto);
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
