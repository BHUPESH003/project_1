import { Injectable } from '@nestjs/common';
import { PrismaService } from '@/prisma/prisma.service';

export interface UserAddressEntity {
  id: string;
  userId: string;
  label: string;
  addressLine: string;
  receiverName: string | null;
  receiverPhone: string | null;
  latitude: number | null;
  longitude: number | null;
  createdAt: Date;
}

@Injectable()
export class UserAddressRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findByUserId(userId: string): Promise<UserAddressEntity[]> {
    const list = await this.prisma.prisma.userAddress.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    });
    return list.map((a) => this.map(a));
  }

  async findByIdAndUser(
    id: string,
    userId: string,
  ): Promise<UserAddressEntity | null> {
    const a = await this.prisma.prisma.userAddress.findFirst({
      where: { id, userId },
    });
    return a ? this.map(a) : null;
  }

  async create(data: {
    userId: string;
    label: string;
    addressLine: string;
    latitude?: number | null;
    longitude?: number | null;
    receiverName?: string;
    receiverPhone?: string;
  }): Promise<UserAddressEntity> {
    const a = await this.prisma.prisma.userAddress.create({
      data: {
        userId: data.userId,
        label: data.label,
        addressLine: data.addressLine,
        latitude: data.latitude ?? undefined,
        longitude: data.longitude ?? undefined,
        receiverName: data.receiverName,
        receiverPhone: data.receiverPhone,
      } as any,
    });
    return this.map(a);
  }

  async delete(id: string, userId: string): Promise<boolean> {
    const result = await this.prisma.prisma.userAddress.deleteMany({
      where: { id, userId },
    });
    return result.count > 0;
  }

  private map(a: any): UserAddressEntity {
    return {
      id: a.id,
      userId: a.userId,
      label: a.label,
      addressLine: a.addressLine,
      receiverName: a.receiverName ?? null,
      receiverPhone: a.receiverPhone ?? null,
      latitude: a.latitude != null ? Number(a.latitude) : null,
      longitude: a.longitude != null ? Number(a.longitude) : null,
      createdAt: a.createdAt,
    };
  }
}
