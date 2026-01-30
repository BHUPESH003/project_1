/**
 * Notifications API helper
 * Exposes endpoints to register device tokens etc.
 */

import client from './client';

export const notificationsApi = {
  async registerDeviceToken(token: string): Promise<void> {
    await client.post('/notifications/register', { token });
  },

  async unregisterDeviceToken(token: string): Promise<void> {
    await client.post('/notifications/unregister', { token });
  },
};
