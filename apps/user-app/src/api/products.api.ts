/**
 * Products API – Fetch products/items for a specific seller
 * Returns category-specific items based on seller capabilities
 */

import client from './client';
import { unwrap } from './unwrap';

export interface Product {
  id: string;
  sellerId: string;
  category: string;
  name: string;
  description: string;
  price: number;
  image?: string;
  unit?: string;
  inStock?: boolean;
}

export interface SellerInventory {
  sellerId: string;
  shopName: string;
  categoryId: string;
  products: Product[];
}

export const productsApi = {
  /**
   * GET /sellers/:id/products
   * Fetch all products for a specific seller
   */
  async getSellerProducts(sellerId: string): Promise<Product[]> {
    const res = await client.get(`/sellers/${sellerId}/products`);
    const payload = unwrap<any>(res);
    if (payload && Array.isArray(payload.items)) {
      return payload.items as Product[];
    }
    if (Array.isArray(payload)) {
      return payload as Product[];
    }
    return [];
  },

  /**
   * GET /sellers/:id/inventory
   * Fetch seller inventory with shop details
   */
  async getSellerInventory(sellerId: string): Promise<SellerInventory> {
    const res = await client.get(`/sellers/${sellerId}/inventory`);
    return unwrap(res) as SellerInventory;
  },

  /**
   * Search products across sellers
   */
  async searchProducts(query: string, categoryId?: string): Promise<Product[]> {
    const res = await client.get('/products/search', {
      params: { q: query, categoryId },
    });
    return unwrap(res) as Product[];
  },
};
