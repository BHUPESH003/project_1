import client from './client';

export const favoritesApi = {
  async addFavorite(sellerId: string): Promise<void> {
    await client.post('/favorites', { sellerId });
  },

  async removeFavorite(sellerId: string): Promise<void> {
    await client.delete(`/favorites/${sellerId}`);
  },
};

export default favoritesApi;
