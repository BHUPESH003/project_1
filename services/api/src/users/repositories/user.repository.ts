import { Injectable } from '@nestjs/common';
import { UserRole } from '@repo/types';
import { PrismaService } from '@/prisma/prisma.service';
import { IBaseRepository } from '@/common/repositories/base.repository';

/**
 * User Entity Type
 * Represents the shape of User data returned from repository
 */
export interface UserEntity {
  id: string;
  phone: string;
  email: string | null;
  name: string | null;
  role: UserRole;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * User Repository
 *
 * Handles all database operations for User entity.
 * Abstracts Prisma-specific queries from services.
 */
@Injectable()
export class UserRepository implements IBaseRepository<UserEntity> {
  constructor(private readonly prismaService: PrismaService) {}

  /**
   * Find user by ID
   */
  async findById(id: string): Promise<UserEntity | null> {
    const user = await this.prismaService.prisma.user.findUnique({
      where: { id },
    });
    return user ? this.mapToEntity(user) : null;
  }

  /**
   * Find user by phone number
   */
  async findByPhone(phone: string): Promise<UserEntity | null> {
    const user = await this.prismaService.prisma.user.findUnique({
      where: { phone },
    });
    return user ? this.mapToEntity(user) : null;
  }

  /**
   * Find all users (with optional filters)
   */
  async findAll(filters?: { role?: UserRole }): Promise<UserEntity[]> {
    const users = await this.prismaService.prisma.user.findMany({
      where: filters,
      orderBy: { createdAt: 'desc' },
    });
    return users.map((u) => this.mapToEntity(u));
  }

  /**
   * Create new user
   */
  async create(data: {
    phone: string;
    role: UserRole;
    email?: string | null;
    name?: string | null;
  }): Promise<UserEntity> {
    const user = await this.prismaService.prisma.user.create({
      data: {
        phone: data.phone,
        role: data.role as unknown as UserRole, // Map to Prisma enum
        email: data.email ?? null,
        name: data.name ?? null,
      },
    });
    return this.mapToEntity(user);
  }

  /**
   * Update user by ID
   */
  async update(
    id: string,
    data: Partial<{
      email: string | null;
      name: string | null;
      role: UserRole;
    }>,
  ): Promise<UserEntity> {
    const user = await this.prismaService.prisma.user.update({
      where: { id },
      data: data.role
        ? { ...data, role: data.role as unknown as UserRole }
        : data,
    });
    return this.mapToEntity(user);
  }

  /**
   * Map Prisma user to UserEntity
   * Converts Prisma enum to our custom enum type
   */
  private mapToEntity(user: {
    id: string;
    phone: string;
    email: string | null;
    name: string | null;
    role: unknown;
    createdAt: Date;
    updatedAt: Date;
  }): UserEntity {
    return {
      ...user,
      role: user.role as UserRole, // Type assertion for enum compatibility
    };
  }

  /**
   * Delete user by ID
   */
  async delete(id: string): Promise<void> {
    await this.prismaService.prisma.user.delete({
      where: { id },
    });
  }

  /**
   * Find or create user by phone
   * Useful for authentication flow
   */
  async findOrCreate(data: {
    phone: string;
    role: UserRole;
  }): Promise<UserEntity> {
    const existing = await this.findByPhone(data.phone);
    if (existing) {
      return existing;
    }

    return this.create(data);
  }
}
