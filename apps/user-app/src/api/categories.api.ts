/**
 * Categories API – backend GET /categories.
 * Returns list with id, name, status (ACTIVE | COMING_SOON).
 */

import client from './client';
import { unwrap } from './unwrap';

export interface Category {
  id: string;
  name: string;
  iconUrl?: string | null;
  status: string;
}

export const categoriesApi = {
  async getCategories(): Promise<Category[]> {
    const res = await client.get('/categories');
    return unwrap(res) as Category[];
  },
};
