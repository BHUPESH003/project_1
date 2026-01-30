/**
 * Sellers/Categories API endpoints
 * Fetch categories, seller services, pricing
 */

import client from './client';

export interface Category {
  id: string;
  name: string;
  description: string;
  icon?: string;
  isAvailable: boolean;
}

export interface Service {
  id: string;
  categoryId: string;
  sellerId: string;
  name: string;
  description: string;
  basePrice: number;
  turnaroundTime: string;
}

export const sellersApi = {
  /**
   * Get all available categories
   */
  async getCategories(): Promise<Category[]> {
    const { data } = await client.get('/categories');
    return data;
  },

  /**
   * Get category details
   */
  async getCategory(categoryId: string): Promise<Category> {
    const { data } = await client.get(`/categories/${categoryId}`);
    return data;
  },

  /**
   * Get services for a category
   */
  async getCategoryServices(categoryId: string): Promise<Service[]> {
    const { data } = await client.get(`/categories/${categoryId}/services`);
    return data;
  },

  /**
   * Search sellers by category
   */
  async searchSellers(categoryId: string, query?: string): Promise<any[]> {
    const { data } = await client.get(`/sellers/search`, {
      params: { categoryId, query },
    });
    return data;
  },
};
