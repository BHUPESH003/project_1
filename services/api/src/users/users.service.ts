import { Injectable, NotFoundException } from '@nestjs/common';
import { UserRepository } from './repositories/user.repository';
import { UserAddressRepository } from './repositories/user-address.repository';
import { CreateAddressDto } from './dto/create-address.dto';
import { UpdateNotificationPreferencesDto } from './dto/update-notification-preferences.dto';

@Injectable()
export class UsersService {
  constructor(
    private readonly userRepository: UserRepository,
    private readonly userAddressRepository: UserAddressRepository,
  ) {}

  async getMe(userId: string) {
    const user = await this.userRepository.findById(userId);
    if (!user) {
      throw new NotFoundException('User not found');
    }
    return {
      id: user.id,
      phone: user.phone,
      name: user.name ?? null,
      email: user.email ?? null,
      role: user.role,
    };
  }

  async updateMe(userId: string, body: { name?: string; email?: string }) {
    const u = await this.userRepository.update(userId, {
      ...(body.name !== undefined && { name: body.name }),
      ...(body.email !== undefined && { email: body.email }),
    });
    return {
      id: u.id,
      phone: u.phone,
      name: u.name ?? null,
      email: u.email ?? null,
      role: u.role,
    };
  }

  async getMyAddresses(userId: string) {
    const list = await this.userAddressRepository.findByUserId(userId);
    return list.map((a) => ({
      id: a.id,
      label: a.label,
      addressLine: a.addressLine,
      latitude: a.latitude,
      longitude: a.longitude,
      createdAt: a.createdAt,
    }));
  }

  async addAddress(userId: string, dto: CreateAddressDto) {
    const a = await this.userAddressRepository.create({
      userId,
      label: dto.label,
      addressLine: dto.addressLine,
      latitude: dto.latitude,
      longitude: dto.longitude,
    });
    return {
      id: a.id,
      label: a.label,
      addressLine: a.addressLine,
      latitude: a.latitude,
      longitude: a.longitude,
      createdAt: a.createdAt,
    };
  }

  async deleteAddress(userId: string, addressId: string) {
    const deleted = await this.userAddressRepository.delete(addressId, userId);
    if (!deleted) {
      throw new NotFoundException('Address not found');
    }
    return { deleted: true };
  }

  async getNotificationPreferences(userId: string) {
    const user = await this.userRepository.findById(userId);
    if (!user) {
      throw new NotFoundException('User not found');
    }
    return {
      orderUpdates: user.notificationOrderUpdates,
      promotions: user.notificationPromotions,
    };
  }

  async updateNotificationPreferences(userId: string, dto: UpdateNotificationPreferencesDto) {
    const u = await this.userRepository.update(userId, {
      ...(dto.orderUpdates !== undefined && { notificationOrderUpdates: dto.orderUpdates }),
      ...(dto.promotions !== undefined && { notificationPromotions: dto.promotions }),
    });
    return {
      orderUpdates: u.notificationOrderUpdates,
      promotions: u.notificationPromotions,
    };
  }
}
