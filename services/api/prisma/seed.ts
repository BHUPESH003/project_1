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
      where: { id: 'hardware' },
      update: {},
      create: {
        id: 'hardware',
        name: 'Hardware',
        description: 'Plumbing, electrical, and construction supplies',
        status: CategoryStatus.ACTIVE,
        displayOrder: 2,
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
        displayOrder: 3,
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

    // Create users for all sellers (print shops + hardware shops)
    const sellerPhones = [
      '+919876543210', // Test seller
      '+919999999999', // Sonipat seller
      // Print shops
      '+919111111111', // Fast Print Shop Delhi
      '+919222222222', // Excel Printing Solutions
      '+919333333333', // Quick Copy Center
      '+919444444444', // Digital Print House
      // Hardware shops
      '+919555555555', // Raj Hardware Store
      '+919666666666', // BuildMart Hardware
      '+919777777777', // Super Tools & Hardware
      '+919888888888', // Total Hardware Solution
    ];

    const sellerUsers: Record<string, any> = {};
    for (let i = 0; i < sellerPhones.length; i++) {
      const phone = sellerPhones[i];
      sellerUsers[phone] = await prisma.user.upsert({
        where: { phone },
        update: {},
        create: {
          phone,
          role: UserRole.SELLER,
          name: phone === '+919876543210' ? 'Test Seller' : 
                phone === '+919999999999' ? 'Sonipat Seller' :
                `Seller ${i}`,
        },
      });
    }

    console.log('✅ Test users seeded');

    // Seed Test Seller Profile and Multiple Shops
    console.log('Seeding test seller profiles...');

    // Print Shops Data (5 shops with different distances and prices)
    const printShops = [
      {
        userId: sellerUsers['+919876543210'].id,
        shopName: 'Fast Print Shop',
        address: '123 Main Street, Delhi',
        latitude: '28.6139',
        longitude: '77.209',
        pricePerPage: '2.0',
        prepTimeMinutes: 30,
      },
      {
        userId: sellerUsers['+919999999999'].id,
        shopName: 'Sonipat Print Hub',
        address: 'Sector 61, Sonipat, Haryana',
        latitude: '28.9038',
        longitude: '77.1198',
        pricePerPage: '2.5',
        prepTimeMinutes: 20,
      },
      {
        userId: sellerUsers['+919111111111'].id,
        shopName: 'Fast Print Shop Delhi',
        address: '456 Mall Road, Delhi',
        latitude: '28.6245',
        longitude: '77.2045',
        pricePerPage: '1.8',
        prepTimeMinutes: 25,
      },
      {
        userId: sellerUsers['+919222222222'].id,
        shopName: 'Excel Printing Solutions',
        address: 'Khan Market, Delhi',
        latitude: '28.5721',
        longitude: '77.2164',
        pricePerPage: '3.5',
        prepTimeMinutes: 35,
      },
      {
        userId: sellerUsers['+919333333333'].id,
        shopName: 'Quick Copy Center',
        address: 'Connaught Place, Delhi',
        latitude: '28.6328',
        longitude: '77.1899',
        pricePerPage: '2.2',
        prepTimeMinutes: 20,
      },
      {
        userId: sellerUsers['+919444444444'].id,
        shopName: 'Digital Print House',
        address: 'Netaji Subhash Place, Delhi',
        latitude: '28.6402',
        longitude: '77.2297',
        pricePerPage: '2.8',
        prepTimeMinutes: 28,
      },
    ];

    // Hardware Shops Data (5 shops with different distances and prices)
    const hardwareShops = [
      {
        userId: sellerUsers['+919555555555'].id,
        shopName: 'Raj Hardware Store',
        address: 'Lajpat Nagar, Delhi',
        latitude: '28.5620',
        longitude: '77.2235',
        pricePerPage: null, // Hardware doesn't use per-page pricing
        prepTimeMinutes: 15,
      },
      {
        userId: sellerUsers['+919666666666'].id,
        shopName: 'BuildMart Hardware',
        address: 'Karol Bagh, Delhi',
        latitude: '28.6500',
        longitude: '77.1847',
        pricePerPage: null,
        prepTimeMinutes: 20,
      },
      {
        userId: sellerUsers['+919777777777'].id,
        shopName: 'Super Tools & Hardware',
        address: 'Dwarka, Delhi',
        latitude: '28.5920',
        longitude: '77.0474',
        pricePerPage: null,
        prepTimeMinutes: 18,
      },
      {
        userId: sellerUsers['+919888888888'].id,
        shopName: 'Total Hardware Solution',
        address: 'Greater Noida, UP',
        latitude: '28.4746',
        longitude: '77.5559',
        pricePerPage: null,
        prepTimeMinutes: 25,
      },
    ];

    // Create print shops
    const printShopSellers: Record<string, any> = {};
    for (const shop of printShops) {
      printShopSellers[shop.userId] = await prisma.seller.upsert({
        where: { userId: shop.userId },
        update: {},
        create: {
          ...shop,
          status: SellerStatus.ONLINE,
        },
      });
    }

    // Create hardware shops
    const hardwareShopSellers: Record<string, any> = {};
    for (const shop of hardwareShops) {
      hardwareShopSellers[shop.userId] = await prisma.seller.upsert({
        where: { userId: shop.userId },
        update: {},
        create: {
          ...shop,
          status: SellerStatus.ONLINE,
        },
      });
    }

    console.log('✅ Test seller profiles seeded');

    // Link sellers to categories
    console.log('Linking sellers to categories...');

    // Link print shops to printing category
    for (const printShop of printShops) {
      const seller = printShopSellers[printShop.userId];
      if (seller?.id) {
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
      }
    }

    // Link hardware shops to hardware category
    for (const hardwareShop of hardwareShops) {
      const seller = hardwareShopSellers[hardwareShop.userId];
      if (seller?.id) {
        await prisma.sellerCategory.upsert({
          where: {
            sellerId_categoryId: {
              sellerId: seller.id,
              categoryId: 'hardware',
            },
          },
          update: {},
          create: {
            sellerId: seller.id,
            categoryId: 'hardware',
          },
        });
      }
    }

    console.log('✅ Seller categories linked');

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
