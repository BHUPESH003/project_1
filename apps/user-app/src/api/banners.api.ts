import client from './client';
import { unwrap } from './unwrap';

export interface PromoBanner {
  id: string;
  badge?: string | null;
  title: string;
  subtitle?: string | null;
  imageUrl: string;
  ctaText?: string | null;
  ctaLink?: string | null;
}

export const bannersApi = {
  async getBanners(): Promise<PromoBanner[]> {
    const res = await client.get('/banners');
    return unwrap(res) as PromoBanner[];
  },
};

export default bannersApi;
