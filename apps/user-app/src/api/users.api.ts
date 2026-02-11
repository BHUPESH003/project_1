/**
 * Users API – profile, addresses, notification preferences (Phase 4G).
 */

import client from './client';
import { unwrap } from './unwrap';

export interface UserProfile {
  id: string;
  phone: string;
  name: string | null;
  email: string | null;
  role: string;
}

export interface UserAddressItem {
  id: string;
  label: string;
  addressLine: string;
  latitude: number | null;
  longitude: number | null;
  createdAt: string;
}

export interface CreateAddressBody {
  label: string;
  addressLine: string;
  latitude?: number;
  longitude?: number;
}

export interface NotificationPreferences {
  orderUpdates: boolean;
  promotions: boolean;
}

export const usersApi = {
  async getMe(): Promise<UserProfile> {
    const res = await client.get('/users/me');
    return unwrap(res) as UserProfile;
  },

  async updateMe(body: { name?: string; email?: string }): Promise<UserProfile> {
    const res = await client.patch('/users/me', body);
    return unwrap(res) as UserProfile;
  },

  async getMyAddresses(): Promise<UserAddressItem[]> {
    const res = await client.get('/users/me/addresses');
    return unwrap(res) as UserAddressItem[];
  },

  async addAddress(body: CreateAddressBody): Promise<UserAddressItem> {
    const res = await client.post('/users/me/addresses', body);
    return unwrap(res) as UserAddressItem;
  },

  async deleteAddress(addressId: string): Promise<{ deleted: boolean }> {
    const res = await client.delete(`/users/me/addresses/${addressId}`);
    return unwrap(res) as { deleted: boolean };
  },

  async getNotificationPreferences(): Promise<NotificationPreferences> {
    const res = await client.get('/users/me/notification-preferences');
    return unwrap(res) as NotificationPreferences;
  },

  async updateNotificationPreferences(body: Partial<NotificationPreferences>): Promise<NotificationPreferences> {
    const res = await client.patch('/users/me/notification-preferences', body);
    return unwrap(res) as NotificationPreferences;
  },
};
