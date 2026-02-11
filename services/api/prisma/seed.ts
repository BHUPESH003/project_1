import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';
import {
  UserRole,
  CategoryStatus,
  SellerStatus,
} from '@repo/types';

/**
 * Seed script for database initialization
 *
 * This runs outside NestJS context, so we create a standalone Prisma client.
 */
async function main() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error('DATABASE_URL environment variable is not set');
  }

  const pool = new Pool({ connectionString });
  const adapter = new PrismaPg(pool);
  const prisma = new PrismaClient({ adapter });

  try {
    // Seed Categories
    console.log('Seeding categories...');
    await prisma.category.upsert({
      where: { id: 'printing' },
      update: {},
      create: {
        id: 'printing',
        name: 'Printing',
        description: 'Print documents, photos, and more',
        status: CategoryStatus.ACTIVE,
        displayOrder: 1,
      },
    });

    await prisma.category.upsert({
      where: { id: 'stationery' },
      update: {},
      create: {
        id: 'stationery',
        name: 'Stationery',
        description: 'Office supplies and stationery items',
        status: CategoryStatus.COMING_SOON,
        displayOrder: 2,
      },
    });

    console.log('✅ Categories seeded');

    // Seed Test Users
    console.log('Seeding test users...');
    const testUser = await prisma.user.upsert({
      where: { phone: '+911234567890' },
      update: {},
      create: {
        phone: '+911234567890',
        role: UserRole.USER,
        name: 'Test User',
      },
    });

    const testSeller = await prisma.user.upsert({
      where: { phone: '+919876543210' },
      update: {},
      create: {
        phone: '+919876543210',
        role: UserRole.SELLER,
        name: 'Test Seller',
      },
    });

    const sonipatSellerUser = await prisma.user.upsert({
      where: { phone: '+919999999999' },
      update: {},
      create: {
        phone: '+919999999999',
        role: UserRole.SELLER,
        name: 'Sonipat Seller',
      },
    });

    console.log('✅ Test users seeded');

    // Seed Test Seller Profile
    console.log('Seeding test seller profile...');

    const seller = await prisma.seller.upsert({
      where: { userId: testSeller.id },
      update: {},
      create: {
        userId: testSeller.id,
        shopName: 'Fast Print Shop',
        address: '123 Main Street, City',
        latitude: 28.6139,
        longitude: 77.209,
        pricePerPage: 2.0,
        prepTimeMinutes: 30,
        status: SellerStatus.OFFLINE,
      },
    });

    const sonipatSeller = await prisma.seller.upsert({
      where: { userId: sonipatSellerUser.id },
      update: {},
      create: {
        userId: sonipatSellerUser.id,
        shopName: 'Sonipat Print Hub',
        address: 'Sector 61, Sonipat, Haryana',
        latitude: 28.9038,
        longitude: 77.1198,
        pricePerPage: 2.5,
        prepTimeMinutes: 20,
        status: SellerStatus.ONLINE,
      },
    });

    console.log('✅ Test seller profile seeded');

    // Link seller to printing category
    if (seller && seller.id) {
      await prisma.sellerCategory.upsert({
        where: {
          sellerId_categoryId: {
            sellerId: seller.id,
            categoryId: 'printing',
          },
        },
        update: {},
        create: {
          sellerId: seller.id,
          categoryId: 'printing',
        },
      });
      console.log('✅ Seller categories linked');
    } else {
      console.error('❌ Seller not found or created, cannot link to category');
    }

    if (sonipatSeller && sonipatSeller.id) {
      await prisma.sellerCategory.upsert({
        where: {
          sellerId_categoryId: {
            sellerId: sonipatSeller.id,
            categoryId: 'printing',
          },
        },
        update: {},
        create: {
          sellerId: sonipatSeller.id,
          categoryId: 'printing',
        },
      });
      console.log('✅ Sonipat seller categories linked');
    } else {
      console.error('❌ Sonipat seller not found or created, cannot link to category');
    }

    console.log('\n🎉 Database seeded successfully!');
  } catch (error) {
    console.error('Error seeding database:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
    await pool.end();
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });
