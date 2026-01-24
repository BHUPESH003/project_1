import { Controller, Get } from '@nestjs/common';
import { CategoriesService } from './categories.service';

/**
 * Categories Controller - MVP Scope
 *
 * API Contract v1 endpoint:
 * - GET /v1/categories (read-only, public)
 *
 * Returns static category list with status (ACTIVE / COMING_SOON)
 * Only "Printing" is ACTIVE in MVP
 *
 * Removed:
 * - create() - Categories managed by admin/config, not via API
 * - update() - No dynamic category updates in MVP
 * - remove() - Categories never deleted, only status changed
 * - findOne() - Not needed, list is small and static
 *
 * Categories are:
 * - Static configuration
 * - No user-created categories
 * - Status controlled by platform
 */
@Controller('categories')
export class CategoriesController {
  constructor(private readonly categoriesService: CategoriesService) {}

  /**
   * GET /v1/categories
   * Returns list of all categories with their status
   *
   * Example response:
   * [
   *   { id: "printing", name: "Printing", status: "ACTIVE" },
   *   { id: "stationery", name: "Stationery", status: "COMING_SOON" }
   * ]
   */
  @Get()
  findAll() {
    return this.categoriesService.findAll();
  }

  // ❌ REMOVED: create() - Categories are config-driven, not API-created
  // ❌ REMOVED: findOne() - Not needed for MVP, list is small
  // ❌ REMOVED: update() - No category mutations via API
  // ❌ REMOVED: remove() - Categories are never deleted
}

/**
 * MVP CHECK:
 * Q: Does every remaining endpoint directly support the MVP order flow or ops safety?
 * A: YES
 *    - findAll() - Critical for user app to show available categories
 */
