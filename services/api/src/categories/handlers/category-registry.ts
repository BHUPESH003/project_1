/**
 * Category Registry
 *
 * Factory/Registry pattern for Category Handlers.
 * Allows easy registration and retrieval of category handlers.
 * Falls back to generic handler if specific handler not found.
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
  private genericHandler: CategoryHandler | null = null;

  /**
   * Register a category handler
   * @param handler - Category handler instance
   */
  register(handler: CategoryHandler): void {
    const categoryId = handler.getCategoryId();
    this.handlers.set(categoryId, handler);

    // Store generic handler for fallback
    if (categoryId === 'generic') {
      this.genericHandler = handler;
    }

    this.logger.log(`Registered handler for category: ${categoryId}`);
  }

  /**
   * Get handler for a category
   * @param categoryId - Category ID
   * @returns Category handler instance (specific or generic fallback)
   * @throws Error if no specific handler and no generic handler available
   */
  getHandler(categoryId: string): CategoryHandler {
    // Try to get specific handler first
    const handler = this.handlers.get(categoryId);
    if (handler) {
      return handler;
    }

    // Fall back to generic handler
    if (this.genericHandler) {
      this.logger.log(`Using generic handler for category: ${categoryId}`);
      return this.genericHandler;
    }

    // No handler found
    throw new Error(
      `No handler registered for category: ${categoryId}. Available categories: ${Array.from(this.handlers.keys()).join(', ') || 'none'}`,
    );
  }

  /**
   * Check if a handler is registered for a category
   * @param categoryId - Category ID
   * @returns true if handler exists or generic handler available
   */
  hasHandler(categoryId: string): boolean {
    return this.handlers.has(categoryId) || this.genericHandler !== null;
  }

  /**
   * Get all registered category IDs
   * @returns Array of category IDs
   */
  getRegisteredCategories(): string[] {
    return Array.from(this.handlers.keys());
  }
}
