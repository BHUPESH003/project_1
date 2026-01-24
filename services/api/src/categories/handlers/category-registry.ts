/**
 * Category Registry
 *
 * Factory/Registry pattern for Category Handlers.
 * Allows easy registration and retrieval of category handlers.
 *
 * CRITICAL: OrdersService uses this registry to get handlers.
 * No if/else statements checking category name.
 */

import { Injectable, Logger } from '@nestjs/common';
import { CategoryHandler } from './category-handler.interface';

@Injectable()
export class CategoryRegistry {
  private readonly logger = new Logger(CategoryRegistry.name);
  private readonly handlers = new Map<string, CategoryHandler>();

  /**
   * Register a category handler
   * @param handler - Category handler instance
   */
  register(handler: CategoryHandler): void {
    const categoryId = handler.getCategoryId();
    this.handlers.set(categoryId, handler);
    this.logger.log(`Registered handler for category: ${categoryId}`);
  }

  /**
   * Get handler for a category
   * @param categoryId - Category ID
   * @returns Category handler instance
   * @throws Error if handler not found
   */
  getHandler(categoryId: string): CategoryHandler {
    const handler = this.handlers.get(categoryId);
    if (!handler) {
      throw new Error(
        `No handler registered for category: ${categoryId}. Available categories: ${Array.from(this.handlers.keys()).join(', ') || 'none'}`,
      );
    }
    return handler;
  }

  /**
   * Check if a handler is registered for a category
   * @param categoryId - Category ID
   * @returns true if handler exists, false otherwise
   */
  hasHandler(categoryId: string): boolean {
    return this.handlers.has(categoryId);
  }

  /**
   * Get all registered category IDs
   * @returns Array of category IDs
   */
  getRegisteredCategories(): string[] {
    return Array.from(this.handlers.keys());
  }
}
