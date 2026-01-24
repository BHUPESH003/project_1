/**
 * Base Repository Interface
 *
 * Defines the contract for all repositories.
 * This abstraction allows swapping ORMs without changing service code.
 *
 * All repositories should implement this interface.
 */
export interface IBaseRepository<T> {
  /**
   * Find entity by ID
   */
  findById(id: string): Promise<T | null>;

  /**
   * Find all entities (with optional filters)
   */
  findAll(filters?: Record<string, unknown>): Promise<T[]>;

  /**
   * Create new entity
   */
  create(data: Partial<T>): Promise<T>;

  /**
   * Update entity by ID
   */
  update(id: string, data: Partial<T>): Promise<T>;

  /**
   * Delete entity by ID
   */
  delete(id: string): Promise<void>;
}
