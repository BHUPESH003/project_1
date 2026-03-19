import { PrismaClient, Decimal } from '@prisma/client';
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
    // ──────────────────────────────────────────────
    // CATEGORIES
    // ──────────────────────────────────────────────
    console.log('Seeding categories...');

    await prisma.category.upsert({
      where: { id: 'printing' },
      update: { iconPath: 'https://images.unsplash.com/photo-1563986768494-4dee2763ff0f?auto=format&fit=crop&w=200&q=80' },
      create: {
        id: 'printing',
        name: 'Printing',
        description: 'Print documents, photos, and more',
        status: CategoryStatus.ACTIVE,
        displayOrder: 1,
        iconPath: 'https://images.unsplash.com/photo-1563986768494-4dee2763ff0f?auto=format&fit=crop&w=200&q=80',
      },
    });

    await prisma.category.upsert({
      where: { id: 'hardware' },
      update: { iconPath: 'https://images.unsplash.com/photo-1504307651254-35680f356dfd?auto=format&fit=crop&w=200&q=80' },
      create: {
        id: 'hardware',
        name: 'Hardware',
        description: 'Plumbing, electrical, and construction supplies',
        status: CategoryStatus.ACTIVE,
        displayOrder: 2,
        iconPath: 'https://images.unsplash.com/photo-1504307651254-35680f356dfd?auto=format&fit=crop&w=200&q=80',
      },
    });

    await prisma.category.upsert({
      where: { id: 'stationery' },
      update: { iconPath: 'https://images.unsplash.com/photo-1517842645767-c639042777db?auto=format&fit=crop&w=200&q=80' },
      create: {
        id: 'stationery',
        name: 'Stationery',
        description: 'Office supplies and stationery items',
        status: CategoryStatus.COMING_SOON,
        displayOrder: 3,
        iconPath: 'https://images.unsplash.com/photo-1517842645767-c639042777db?auto=format&fit=crop&w=200&q=80',
      },
    });

    await prisma.category.upsert({
      where: { id: 'sports' },
      update: { iconPath: 'https://images.unsplash.com/photo-1461896836934-ffe607ba8211?auto=format&fit=crop&w=200&q=80' },
      create: {
        id: 'sports',
        name: 'Sports',
        description: 'Sports equipment, fitness gear, and outdoor accessories',
        status: CategoryStatus.ACTIVE,
        displayOrder: 4,
        iconPath: 'https://images.unsplash.com/photo-1461896836934-ffe607ba8211?auto=format&fit=crop&w=200&q=80',
      },
    });

    console.log('✅ Categories seeded');

    // ──────────────────────────────────────────────
    // BANNERS
    // ──────────────────────────────────────────────
    console.log('Seeding banners...');
    await prisma.banner.deleteMany({});
    await prisma.banner.createMany({
      data: [
        {
          badge: 'SALE',
          title: '50% off on your first print order',
          subtitle: 'Use code PRINT50 at checkout',
          imagePath: 'https://images.unsplash.com/photo-1542838132-92c53300491e?auto=format&fit=crop&w=800&q=80',
          ctaText: 'Shop Now',
          displayOrder: 1,
          isActive: true,
        },
        {
          badge: 'NEW',
          title: 'Hardware materials delivered locally',
          subtitle: 'Get tools and supplies in 30 mins',
          imagePath: 'https://images.unsplash.com/photo-1504307651254-35680f356dfd?auto=format&fit=crop&w=800&q=80',
          ctaText: 'Explore',
          displayOrder: 2,
          isActive: true,
        },
        {
          badge: 'SPORTS',
          title: 'Gear up for the season',
          subtitle: 'Top quality equipment',
          imagePath: 'https://images.unsplash.com/photo-1461896836934-ffe607ba8211?auto=format&fit=crop&w=800&q=80',
          ctaText: 'Buy Now',
          displayOrder: 3,
          isActive: true,
        }
      ],
    });
    console.log('✅ Banners seeded');


    // ──────────────────────────────────────────────
    // USERS
    // ──────────────────────────────────────────────
    console.log('Seeding test users...');

    await prisma.user.upsert({
      where: { phone: '+911234567890' },
      update: {},
      create: {
        phone: '+911234567890',
        role: UserRole.USER,
        name: 'Test User',
      },
    });

    const sellerPhones = [
      // Print shops
      '+919876543210',
      '+919999999999',
      '+919111111111',
      '+919222222222',
      '+919333333333',
      '+919444444444',
      // Hardware shops
      '+919555555555',
      '+919666666666',
      '+919777777777',
      '+919888888888',
      '+919100000001',
      '+919100000002',
      // Sports shops
      '+919200000001',
      '+919200000002',
      '+919200000003',
      '+919200000004',
    ];

    const sellerUsers: Record<string, any> = {};
    const sellerNameMap: Record<string, string> = {
      '+919876543210': 'Test Seller',
      '+919999999999': 'Sonipat Seller',
      '+919111111111': 'Fast Print Delhi',
      '+919222222222': 'Excel Printing',
      '+919333333333': 'Quick Copy',
      '+919444444444': 'Digital Print House',
      '+919555555555': 'Raj Hardware',
      '+919666666666': 'BuildMart',
      '+919777777777': 'Super Tools',
      '+919888888888': 'Total Hardware',
      '+919100000001': 'Metro Hardware Store',
      '+919100000002': 'Pro Build Supplies',
      '+919200000001': 'Champion Sports',
      '+919200000002': 'FitZone Equipment',
      '+919200000003': 'PlayMore Sports',
      '+919200000004': 'Victory Sports Arena',
    };

    for (const phone of sellerPhones) {
      sellerUsers[phone] = await prisma.user.upsert({
        where: { phone },
        update: {},
        create: {
          phone,
          role: UserRole.SELLER,
          name: sellerNameMap[phone] ?? phone,
        },
      });
    }

    console.log('✅ Test users seeded');

    // ──────────────────────────────────────────────
    // SELLER PROFILES
    // ──────────────────────────────────────────────
    console.log('Seeding seller profiles...');

    // ── Print Shops ──
    const printShopDefs = [
      {
        phone: '+919876543210',
        shopName: 'Fast Print Shop',
        address: '123 Main Street, Delhi',
        latitude: '28.6139',
        longitude: '77.2090',
        pricePerPage: '2.0',
        prepTimeMinutes: 30,
        imagePath: 'https://images.unsplash.com/photo-1555396273-367ea4eb4db5?auto=format&fit=crop&w=400&q=80',
        rating: 4.5,
      },
      {
        phone: '+919999999999',
        shopName: 'Sonipat Print Hub',
        address: 'Sector 61, Sonipat, Haryana',
        latitude: '28.9038',
        longitude: '77.1198',
        pricePerPage: '2.5',
        prepTimeMinutes: 20,
        imagePath: 'https://images.unsplash.com/photo-1555396273-367ea4eb4db5?auto=format&fit=crop&w=400&q=80',
        rating: 4.5,
        isTrending: true,
      },
      {
        phone: '+919111111111',
        shopName: 'Fast Print Shop Delhi',
        address: '456 Mall Road, Delhi',
        latitude: '28.6245',
        longitude: '77.2045',
        pricePerPage: '1.8',
        prepTimeMinutes: 25,
        imagePath: 'https://images.unsplash.com/photo-1555396273-367ea4eb4db5?auto=format&fit=crop&w=400&q=80',
        rating: 4.5,
      },
      {
        phone: '+919222222222',
        shopName: 'Excel Printing Solutions',
        address: 'Khan Market, Delhi',
        latitude: '28.5721',
        longitude: '77.2164',
        pricePerPage: '3.5',
        prepTimeMinutes: 35,
        imagePath: 'https://images.unsplash.com/photo-1555396273-367ea4eb4db5?auto=format&fit=crop&w=400&q=80',
        rating: 4.5,
      },
      {
        phone: '+919333333333',
        shopName: 'Quick Copy Center',
        address: 'Connaught Place, Delhi',
        latitude: '28.6328',
        longitude: '77.1899',
        pricePerPage: '2.2',
        prepTimeMinutes: 20,
        imagePath: 'https://images.unsplash.com/photo-1555396273-367ea4eb4db5?auto=format&fit=crop&w=400&q=80',
        rating: 4.5,
      },
      {
        phone: '+919444444444',
        shopName: 'Digital Print House',
        address: 'Netaji Subhash Place, Delhi',
        latitude: '28.6402',
        longitude: '77.2297',
        pricePerPage: '2.8',
        prepTimeMinutes: 28,
        imagePath: 'https://images.unsplash.com/photo-1555396273-367ea4eb4db5?auto=format&fit=crop&w=400&q=80',
        rating: 4.5,
      },
    ];

    // ── Hardware Shops ──
    const hardwareShopDefs = [
      {
        phone: '+919555555555',
        shopName: 'Raj Hardware Store',
        address: 'Lajpat Nagar, Delhi',
        latitude: '28.5620',
        longitude: '77.2235',
        prepTimeMinutes: 15,
        imagePath: 'https://images.unsplash.com/photo-1555396273-367ea4eb4db5?auto=format&fit=crop&w=400&q=80',
        rating: 4.5,
      },
      {
        phone: '+919666666666',
        shopName: 'BuildMart Hardware',
        address: 'Karol Bagh, Delhi',
        latitude: '28.6500',
        longitude: '77.1847',
        prepTimeMinutes: 20,
        imagePath: 'https://images.unsplash.com/photo-1555396273-367ea4eb4db5?auto=format&fit=crop&w=400&q=80',
        rating: 4.5,
        isTrending: true,
      },
      {
        phone: '+919777777777',
        shopName: 'Super Tools & Hardware',
        address: 'Dwarka, Delhi',
        latitude: '28.5920',
        longitude: '77.0474',
        prepTimeMinutes: 18,
        imagePath: 'https://images.unsplash.com/photo-1555396273-367ea4eb4db5?auto=format&fit=crop&w=400&q=80',
        rating: 4.5,
      },
      {
        phone: '+919888888888',
        shopName: 'Total Hardware Solution',
        address: 'Greater Noida, UP',
        latitude: '28.4746',
        longitude: '77.5559',
        prepTimeMinutes: 25,
        imagePath: 'https://images.unsplash.com/photo-1555396273-367ea4eb4db5?auto=format&fit=crop&w=400&q=80',
        rating: 4.5,
      },
      {
        phone: '+919100000001',
        shopName: 'Metro Hardware Store',
        address: 'Rohini, Delhi',
        latitude: '28.7041',
        longitude: '77.1025',
        prepTimeMinutes: 22,
        imagePath: 'https://images.unsplash.com/photo-1555396273-367ea4eb4db5?auto=format&fit=crop&w=400&q=80',
        rating: 4.5,
        isTrending: true,
      },
      {
        phone: '+919100000002',
        shopName: 'Pro Build Supplies',
        address: 'Faridabad, Haryana',
        latitude: '28.4089',
        longitude: '77.3178',
        prepTimeMinutes: 30,
        imagePath: 'https://images.unsplash.com/photo-1555396273-367ea4eb4db5?auto=format&fit=crop&w=400&q=80',
        rating: 4.5,
      },
    ];

    // ── Sports Shops ──
    const sportsShopDefs = [
      {
        phone: '+919200000001',
        shopName: 'Champion Sports',
        address: 'Rajouri Garden, Delhi',
        latitude: '28.6439',
        longitude: '77.1195',
        prepTimeMinutes: 20,
        imagePath: 'https://images.unsplash.com/photo-1555396273-367ea4eb4db5?auto=format&fit=crop&w=400&q=80',
        rating: 4.5,
        isTrending: true,
      },
      {
        phone: '+919200000002',
        shopName: 'FitZone Equipment',
        address: 'Sector 18, Noida, UP',
        latitude: '28.5697',
        longitude: '77.3219',
        prepTimeMinutes: 25,
        imagePath: 'https://images.unsplash.com/photo-1555396273-367ea4eb4db5?auto=format&fit=crop&w=400&q=80',
        rating: 4.5,
      },
      {
        phone: '+919200000003',
        shopName: 'PlayMore Sports',
        address: 'Pitampura, Delhi',
        latitude: '28.7005',
        longitude: '77.1489',
        prepTimeMinutes: 15,
        imagePath: 'https://images.unsplash.com/photo-1555396273-367ea4eb4db5?auto=format&fit=crop&w=400&q=80',
        rating: 4.5,
        isTrending: true,
      },
      {
        phone: '+919200000004',
        shopName: 'Victory Sports Arena',
        address: 'Gurgaon, Haryana',
        latitude: '28.4595',
        longitude: '77.0266',
        prepTimeMinutes: 30,
        imagePath: 'https://images.unsplash.com/photo-1555396273-367ea4eb4db5?auto=format&fit=crop&w=400&q=80',
        rating: 4.5,
      },
    ];

    // Helper: upsert seller and return record
    const upsertSeller = async (def: any) => {
      const userId = sellerUsers[def.phone].id;
      const { phone, ...rest } = def;
      return prisma.seller.upsert({
        where: { userId },
        update: { status: SellerStatus.ONLINE, ...rest }, // ensure imagePath gets updated
        create: { userId, status: SellerStatus.ONLINE, pricePerPage: null, ...rest },
      });
    };

    const printSellers: Record<string, any> = {};
    for (const def of printShopDefs) {
      printSellers[def.phone] = await upsertSeller(def);
    }

    const hardwareSellers: Record<string, any> = {};
    for (const def of hardwareShopDefs) {
      hardwareSellers[def.phone] = await upsertSeller(def);
    }

    const sportsSellers: Record<string, any> = {};
    for (const def of sportsShopDefs) {
      sportsSellers[def.phone] = await upsertSeller(def);
    }

    console.log('✅ Seller profiles seeded');

    // ──────────────────────────────────────────────
    // CATEGORY LINKS
    // ──────────────────────────────────────────────
    console.log('Linking sellers to categories...');

    const linkToCategory = async (sellerId: string, categoryId: string) => {
      await prisma.sellerCategory.upsert({
        where: { sellerId_categoryId: { sellerId, categoryId } },
        update: {},
        create: { sellerId, categoryId },
      });
    };

    for (const s of Object.values(printSellers)) {
      if (s?.id) await linkToCategory(s.id, 'printing');
    }
    for (const s of Object.values(hardwareSellers)) {
      if (s?.id) await linkToCategory(s.id, 'hardware');
    }
    for (const s of Object.values(sportsSellers)) {
      if (s?.id) await linkToCategory(s.id, 'sports');
    }

    console.log('✅ Seller categories linked');

    // ──────────────────────────────────────────────
    // PRODUCTS
    // ──────────────────────────────────────────────
    console.log('Seeding products...');

    const upsertProduct = async (product: {
      sellerId: string;
      name: string;
      description: string;
      category: string;
      price: string;
      mrp?: string;
      image: string;
    }) => {
      if (!product.sellerId) return;
      await prisma.product.upsert({
        where: { sellerId_name: { sellerId: product.sellerId, name: product.name } },
        update: {},
        create: { ...product, mrp: product.mrp ?? null, inStock: true },
      });
    };

    // ────────────────────────────────
    // PRINT SHOP PRODUCTS
    // ────────────────────────────────
    const printProducts = [
      // Fast Print Shop (+919876543210)
      { phone: '+919876543210', name: 'B&W Document Print', description: 'Standard 80gsm A4 paper, single side', category: 'Printing Services', price: '0.50', mrp: '1.00', image: 'https://images.unsplash.com/photo-1587825140708-dfaf72ae4b04?auto=format&fit=crop&w=400&q=80' },
      { phone: '+919876543210', name: 'Color Laser Print', description: 'High-quality 100gsm A4 color print', category: 'Printing Services', price: '2.00', image: 'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?auto=format&fit=crop&w=400&q=80' },
      { phone: '+919876543210', name: 'A3 Poster Print', description: 'Full-color A3 glossy poster print', category: 'Printing Services', price: '15.00', mrp: '20.00', image: 'https://images.unsplash.com/photo-1611532736597-de2d4265fba3?auto=format&fit=crop&w=400&q=80' },
      { phone: '+919876543210', name: 'Spiral Binding', description: 'Spiral bind your documents up to 200 pages', category: 'Binding Services', price: '25.00', image: 'https://images.unsplash.com/photo-1457369804613-52c61a468e7d?auto=format&fit=crop&w=400&q=80' },
      { phone: '+919876543210', name: 'Lamination A4', description: 'Glossy lamination for A4 sheets', category: 'Finishing Services', price: '8.00', image: 'https://images.unsplash.com/photo-1612198273689-b92fc0c8c88b?auto=format&fit=crop&w=400&q=80' },
      { phone: '+919876543210', name: 'Photo Print 4x6', description: 'Standard 4x6 glossy photo print', category: 'Photo Printing', price: '5.00', mrp: '8.00', image: 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?auto=format&fit=crop&w=400&q=80' },
      { phone: '+919876543210', name: 'Business Card Print (500)', description: 'Premium matte finish, 500 cards', category: 'Marketing Materials', price: '250.00', mrp: '350.00', image: 'https://images.unsplash.com/photo-1611532736597-de2d4265fba3?auto=format&fit=crop&w=400&q=80' },
      { phone: '+919876543210', name: 'Brochure Tri-Fold', description: 'Tri-fold A4 brochure, full color', category: 'Marketing Materials', price: '10.00', image: 'https://images.unsplash.com/photo-1586281380349-632531db7ed4?auto=format&fit=crop&w=400&q=80' },
      { phone: '+919876543210', name: 'ID Card Print', description: 'CR80 size ID card, both sides', category: 'ID Services', price: '30.00', image: 'https://images.unsplash.com/photo-1586281380349-632531db7ed4?auto=format&fit=crop&w=400&q=80' },
      { phone: '+919876543210', name: 'Envelope Print', description: 'A4 envelope with custom branding', category: 'Stationery Print', price: '5.00', image: 'https://images.unsplash.com/photo-1557672172-298e090bd0f1?auto=format&fit=crop&w=400&q=80' },

      // Sonipat Print Hub (+919999999999)
      { phone: '+919999999999', name: 'Premium Brochure Printing', description: 'Full-color brochures on premium 130gsm paper', category: 'Marketing Materials', price: '3.50', mrp: '5.00', image: 'https://images.unsplash.com/photo-1586281380349-632531db7ed4?auto=format&fit=crop&w=400&q=80' },
      { phone: '+919999999999', name: 'A2 Banner Print', description: 'High-resolution A2 banner print', category: 'Banners', price: '80.00', image: 'https://images.unsplash.com/photo-1557672172-298e090bd0f1?auto=format&fit=crop&w=400&q=80' },
      { phone: '+919999999999', name: 'Hardcover Book Binding', description: 'Hardcover binding up to 300 pages', category: 'Binding Services', price: '150.00', mrp: '200.00', image: 'https://images.unsplash.com/photo-1457369804613-52c61a468e7d?auto=format&fit=crop&w=400&q=80' },
      { phone: '+919999999999', name: 'Roll-Up Banner 2x6ft', description: 'Premium roll-up banner with stand', category: 'Banners', price: '450.00', image: 'https://images.unsplash.com/photo-1561736778-92e52a7769ef?auto=format&fit=crop&w=400&q=80' },
      { phone: '+919999999999', name: 'Passport Photo Print', description: 'Set of 8 passport-size photos', category: 'Photo Printing', price: '40.00', mrp: '60.00', image: 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?auto=format&fit=crop&w=400&q=80' },
      { phone: '+919999999999', name: 'Flyer A5 Print (100)', description: '100 single-side A5 flyers, color', category: 'Marketing Materials', price: '120.00', image: 'https://images.unsplash.com/photo-1611532736597-de2d4265fba3?auto=format&fit=crop&w=400&q=80' },
      { phone: '+919999999999', name: 'Letterhead Design & Print', description: 'Custom letterhead 100 sheets', category: 'Stationery Print', price: '200.00', image: 'https://images.unsplash.com/photo-1586281380349-632531db7ed4?auto=format&fit=crop&w=400&q=80' },
      { phone: '+919999999999', name: 'Notepad Printing (50 sheets)', description: 'Custom branded notepad', category: 'Stationery Print', price: '80.00', image: 'https://images.unsplash.com/photo-1507842217343-583bb7270b66?auto=format&fit=crop&w=400&q=80' },
      { phone: '+919999999999', name: 'Stamp Making', description: 'Self-inking rubber stamp', category: 'Office Services', price: '100.00', mrp: '130.00', image: 'https://images.unsplash.com/photo-1512314889357-e157c22f938d?auto=format&fit=crop&w=400&q=80' },
      { phone: '+919999999999', name: 'Lamination Pouch A3', description: 'A3 glossy lamination pouch', category: 'Finishing Services', price: '15.00', image: 'https://images.unsplash.com/photo-1612198273689-b92fc0c8c88b?auto=format&fit=crop&w=400&q=80' },
    ];

    for (const p of printProducts) {
      const sellerId = printSellers[p.phone]?.id;
      if (sellerId) {
        const { phone, ...rest } = p;
        await upsertProduct({ sellerId, ...rest });
      }
    }

    // ────────────────────────────────
    // HARDWARE SHOP PRODUCTS
    // ────────────────────────────────
    const hardwareProducts: Array<{ phone: string; name: string; description: string; category: string; price: string; mrp?: string; image: string }> = [
      // Raj Hardware Store (+919555555555)
      { phone: '+919555555555', name: 'Stainless Steel Tap', description: 'Chrome finish tap for kitchen/bathroom', category: 'Plumbing Supplies', price: '45.00', mrp: '65.00', image: 'https://images.unsplash.com/photo-1585518419759-15bc0e834e6b?auto=format&fit=crop&w=400&q=80' },
      { phone: '+919555555555', name: 'PVC Pipe 1 inch', description: '10 meter durable PVC pipe', category: 'Plumbing Supplies', price: '35.00', image: 'https://images.unsplash.com/photo-1584622181636-ffa00913074e?auto=format&fit=crop&w=400&q=80' },
      { phone: '+919555555555', name: 'Pipe Wrench 12 inch', description: 'Heavy duty adjustable pipe wrench', category: 'Plumbing Tools', price: '28.00', mrp: '38.00', image: 'https://images.unsplash.com/photo-1581092918056-0c4c3acd3789?auto=format&fit=crop&w=400&q=80' },
      { phone: '+919555555555', name: 'CPVC Elbow 1/2 inch', description: 'Pack of 10 CPVC elbow fittings', category: 'Plumbing Supplies', price: '12.00', image: 'https://images.unsplash.com/photo-1504307651254-35680f356dfd?auto=format&fit=crop&w=400&q=80' },
      { phone: '+919555555555', name: 'Teflon Tape Roll', description: 'Pack of 5 PTFE thread seal tapes', category: 'Plumbing Supplies', price: '5.00', image: 'https://images.unsplash.com/photo-1504307651254-35680f356dfd?auto=format&fit=crop&w=400&q=80' },
      { phone: '+919555555555', name: 'Wall Anchors Set', description: 'Plastic & steel mixed anchors, 100pc', category: 'Fasteners', price: '15.00', mrp: '22.00', image: 'https://images.unsplash.com/photo-1587145820098-4b6bea20e3cc?auto=format&fit=crop&w=400&q=80' },
      { phone: '+919555555555', name: 'Measuring Tape 5m', description: 'Auto-lock stainless steel tape', category: 'Measuring Tools', price: '18.00', image: 'https://images.unsplash.com/photo-1572981779307-38b8cabb2407?auto=format&fit=crop&w=400&q=80' },
      { phone: '+919555555555', name: 'Spirit Level 24 inch', description: 'Aluminium spirit level, 3 vials', category: 'Measuring Tools', price: '22.00', image: 'https://images.unsplash.com/photo-1572981779307-38b8cabb2407?auto=format&fit=crop&w=400&q=80' },
      { phone: '+919555555555', name: 'Tile Adhesive 5kg', description: 'Grey tile adhesive, wall & floor', category: 'Construction Materials', price: '48.00', mrp: '60.00', image: 'https://images.unsplash.com/photo-1504307651254-35680f356dfd?auto=format&fit=crop&w=400&q=80' },
      { phone: '+919555555555', name: 'Screwdriver Set 6-Piece', description: 'Flat & Phillips insulated screwdrivers', category: 'Hand Tools', price: '20.00', image: 'https://images.unsplash.com/photo-1530124566582-a618bc2615dc?auto=format&fit=crop&w=400&q=80' },

      // BuildMart Hardware (+919666666666)
      { phone: '+919666666666', name: 'Copper Wire 4mm', description: 'Flexible copper wire, 100m roll', category: 'Electrical Supplies', price: '120.00', image: 'https://images.unsplash.com/photo-1581092918056-0c4c3acd3789?auto=format&fit=crop&w=400&q=80' },
      { phone: '+919666666666', name: 'LED Bulb 15W', description: 'Cool white LED, energy efficient', category: 'Electrical Supplies', price: '25.00', image: 'https://images.unsplash.com/photo-1567864162381-03c3d0c0b0db?auto=format&fit=crop&w=400&q=80' },
      { phone: '+919666666666', name: 'MCB Switch 32A', description: 'Single pole miniature circuit breaker', category: 'Electrical Supplies', price: '85.00', mrp: '110.00', image: 'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?auto=format&fit=crop&w=400&q=80' },
      { phone: '+919666666666', name: 'Extension Board 6-Socket', description: '2m cord, surge protected', category: 'Electrical Supplies', price: '180.00', image: 'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?auto=format&fit=crop&w=400&q=80' },
      { phone: '+919666666666', name: 'Conduit Pipe 25mm', description: 'PVC conduit for wiring, 3m length', category: 'Electrical Supplies', price: '30.00', image: 'https://images.unsplash.com/photo-1504307651254-35680f356dfd?auto=format&fit=crop&w=400&q=80' },
      { phone: '+919666666666', name: 'Junction Box 4x4', description: 'Plastic surface mount junction box', category: 'Electrical Supplies', price: '12.00', image: 'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?auto=format&fit=crop&w=400&q=80' },
      { phone: '+919666666666', name: 'Digital Multimeter', description: 'Auto-range LCD digital multimeter', category: 'Electrical Tools', price: '350.00', mrp: '450.00', image: 'https://images.unsplash.com/photo-1581092918056-0c4c3acd3789?auto=format&fit=crop&w=400&q=80' },
      { phone: '+919666666666', name: 'Wire Stripper', description: 'Self-adjusting ergonomic wire stripper', category: 'Electrical Tools', price: '45.00', image: 'https://images.unsplash.com/photo-1530124566582-a618bc2615dc?auto=format&fit=crop&w=400&q=80' },
      { phone: '+919666666666', name: 'Soldering Iron 25W', description: 'Pencil-type soldering iron with stand', category: 'Electrical Tools', price: '65.00', image: 'https://images.unsplash.com/photo-1581092918056-0c4c3acd3789?auto=format&fit=crop&w=400&q=80' },
      { phone: '+919666666666', name: 'Electrical Tape 10m', description: 'Black PVC insulation tape, pack of 5', category: 'Electrical Supplies', price: '10.00', image: 'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?auto=format&fit=crop&w=400&q=80' },

      // Super Tools & Hardware (+919777777777)
      { phone: '+919777777777', name: 'Hammer with Grip', description: 'Comfortable TPR grip, 500g', category: 'Hand Tools', price: '15.00', image: 'https://images.unsplash.com/photo-1578734854309-c58b20fbf6ee?auto=format&fit=crop&w=400&q=80' },
      { phone: '+919777777777', name: 'Power Drill Machine', description: '13mm chuck, variable speed, 700W', category: 'Power Tools', price: '85.00', mrp: '100.00', image: 'https://images.unsplash.com/photo-1618220179857-7c76a6b50e6d?auto=format&fit=crop&w=400&q=80' },
      { phone: '+919777777777', name: 'Angle Grinder 4.5 inch', description: '850W angle grinder with guard', category: 'Power Tools', price: '120.00', mrp: '150.00', image: 'https://images.unsplash.com/photo-1504307651254-35680f356dfd?auto=format&fit=crop&w=400&q=80' },
      { phone: '+919777777777', name: 'Jigsaw Machine', description: '500W corded jigsaw, 5 blades', category: 'Power Tools', price: '180.00', image: 'https://images.unsplash.com/photo-1618220179857-7c76a6b50e6d?auto=format&fit=crop&w=400&q=80' },
      { phone: '+919777777777', name: 'Hex Key Set 9-Piece', description: 'Metric Allen key set with holder', category: 'Hand Tools', price: '12.00', image: 'https://images.unsplash.com/photo-1530124566582-a618bc2615dc?auto=format&fit=crop&w=400&q=80' },
      { phone: '+919777777777', name: 'Circular Saw 7.25 inch', description: '1200W circular saw with laser guide', category: 'Power Tools', price: '350.00', mrp: '420.00', image: 'https://images.unsplash.com/photo-1504307651254-35680f356dfd?auto=format&fit=crop&w=400&q=80' },
      { phone: '+919777777777', name: 'Pliers Set 3-Piece', description: 'Combination, needle-nose & cutting pliers', category: 'Hand Tools', price: '35.00', image: 'https://images.unsplash.com/photo-1530124566582-a618bc2615dc?auto=format&fit=crop&w=400&q=80' },
      { phone: '+919777777777', name: 'Drill Bit Set 25-Piece', description: 'HSS titanium coated bit set', category: 'Power Tools', price: '50.00', mrp: '70.00', image: 'https://images.unsplash.com/photo-1618220179857-7c76a6b50e6d?auto=format&fit=crop&w=400&q=80' },
      { phone: '+919777777777', name: 'Toolbox 14 inch', description: 'Plastic cantilever toolbox with tray', category: 'Storage', price: '80.00', image: 'https://images.unsplash.com/photo-1530124566582-a618bc2615dc?auto=format&fit=crop&w=400&q=80' },
      { phone: '+919777777777', name: 'Safety Gloves (L)', description: 'Cut-resistant work safety gloves', category: 'Safety Equipment', price: '10.00', image: 'https://images.unsplash.com/photo-1572981779307-38b8cabb2407?auto=format&fit=crop&w=400&q=80' },

      // Total Hardware Solution (+919888888888)
      { phone: '+919888888888', name: 'Wood Stain 1L', description: 'Dark walnut wood stain, water-resistant', category: 'Paints & Finishes', price: '55.00', image: 'https://images.unsplash.com/photo-1581092918056-0c4c3acd3789?auto=format&fit=crop&w=400&q=80' },
      { phone: '+919888888888', name: 'Wall Paint 10L', description: 'Premium interior wall paint, eggshell', category: 'Paints & Finishes', price: '180.00', image: 'https://images.unsplash.com/photo-1610701596007-11502861dcfa?auto=format&fit=crop&w=400&q=80' },
      { phone: '+919888888888', name: 'Paint Roller Set', description: '9" roller with frame, tray & 2 covers', category: 'Painting Tools', price: '25.00', mrp: '35.00', image: 'https://images.unsplash.com/photo-1610701596007-11502861dcfa?auto=format&fit=crop&w=400&q=80' },
      { phone: '+919888888888', name: 'Putty Knife 4 inch', description: 'Flexible stainless blade putty knife', category: 'Painting Tools', price: '10.00', image: 'https://images.unsplash.com/photo-1530124566582-a618bc2615dc?auto=format&fit=crop&w=400&q=80' },
      { phone: '+919888888888', name: 'Primer Coat 4L', description: 'Water-based interior wall primer', category: 'Paints & Finishes', price: '90.00', mrp: '120.00', image: 'https://images.unsplash.com/photo-1610701596007-11502861dcfa?auto=format&fit=crop&w=400&q=80' },
      { phone: '+919888888888', name: 'Masking Tape 2 inch', description: 'Pack of 4 masking tapes, 50m each', category: 'Painting Tools', price: '15.00', image: 'https://images.unsplash.com/photo-1572981779307-38b8cabb2407?auto=format&fit=crop&w=400&q=80' },
      { phone: '+919888888888', name: 'Cement 50kg Bag', description: 'OPC 43 grade Portland cement', category: 'Construction Materials', price: '320.00', image: 'https://images.unsplash.com/photo-1504307651254-35680f356dfd?auto=format&fit=crop&w=400&q=80' },
      { phone: '+919888888888', name: 'Sand Bag 25kg', description: 'Washed river sand for plastering', category: 'Construction Materials', price: '80.00', image: 'https://images.unsplash.com/photo-1504307651254-35680f356dfd?auto=format&fit=crop&w=400&q=80' },
      { phone: '+919888888888', name: 'Steel Trowel 12 inch', description: 'Pool trowel for concrete finishing', category: 'Masonry Tools', price: '22.00', image: 'https://images.unsplash.com/photo-1572981779307-38b8cabb2407?auto=format&fit=crop&w=400&q=80' },
      { phone: '+919888888888', name: 'Safety Helmet', description: 'ISI-marked construction safety helmet', category: 'Safety Equipment', price: '45.00', mrp: '60.00', image: 'https://images.unsplash.com/photo-1587145820098-4b6bea20e3cc?auto=format&fit=crop&w=400&q=80' },

      // Metro Hardware Store (+919100000001)
      { phone: '+919100000001', name: 'HDPE Water Tank 500L', description: 'Triple-layer food-grade water storage tank', category: 'Plumbing Supplies', price: '2500.00', mrp: '3000.00', image: 'https://images.unsplash.com/photo-1504307651254-35680f356dfd?auto=format&fit=crop&w=400&q=80' },
      { phone: '+919100000001', name: 'Submersible Pump 0.5HP', description: 'Deep well submersible water pump', category: 'Plumbing Supplies', price: '1800.00', image: 'https://images.unsplash.com/photo-1585518419759-15bc0e834e6b?auto=format&fit=crop&w=400&q=80' },
      { phone: '+919100000001', name: 'GI Wire 18 gauge', description: '5kg coil of galvanized iron wire', category: 'Construction Materials', price: '65.00', image: 'https://images.unsplash.com/photo-1581092918056-0c4c3acd3789?auto=format&fit=crop&w=400&q=80' },
      { phone: '+919100000001', name: 'M-Seal Epoxy Compound', description: 'Quick-seal plumbing repair compound', category: 'Plumbing Supplies', price: '20.00', image: 'https://images.unsplash.com/photo-1584622181636-ffa00913074e?auto=format&fit=crop&w=400&q=80' },
      { phone: '+919100000001', name: 'Safety Goggles', description: 'Anti-scratch UV-protected safety glasses', category: 'Safety Equipment', price: '18.00', image: 'https://images.unsplash.com/photo-1587145820098-4b6bea20e3cc?auto=format&fit=crop&w=400&q=80' },
      { phone: '+919100000001', name: 'Tile Cutter Manual', description: 'Heavy-duty 60cm manual tile cutter', category: 'Masonry Tools', price: '450.00', mrp: '550.00', image: 'https://images.unsplash.com/photo-1572981779307-38b8cabb2407?auto=format&fit=crop&w=400&q=80' },
      { phone: '+919100000001', name: 'Rubber Mallet 32oz', description: 'Fiberglass handle rubber head mallet', category: 'Hand Tools', price: '22.00', image: 'https://images.unsplash.com/photo-1578734854309-c58b20fbf6ee?auto=format&fit=crop&w=400&q=80' },
      { phone: '+919100000001', name: 'Chain Block 1 Ton', description: 'Manual chain hoist, 1 tonne capacity', category: 'Lifting Equipment', price: '850.00', image: 'https://images.unsplash.com/photo-1530124566582-a618bc2615dc?auto=format&fit=crop&w=400&q=80' },
      { phone: '+919100000001', name: 'Concrete Nails Box', description: '3 inch cut-type concrete nails, 1kg', category: 'Fasteners', price: '18.00', image: 'https://images.unsplash.com/photo-1587145820098-4b6bea20e3cc?auto=format&fit=crop&w=400&q=80' },
      { phone: '+919100000001', name: 'MS Flat Bar 25x6mm', description: 'Mild steel flat bar, 6 meter length', category: 'Construction Materials', price: '180.00', image: 'https://images.unsplash.com/photo-1504307651254-35680f356dfd?auto=format&fit=crop&w=400&q=80' },

      // Pro Build Supplies (+919100000002)
      { phone: '+919100000002', name: 'Angle Iron 40x40mm', description: 'MS angle iron, 6m length', category: 'Construction Materials', price: '220.00', image: 'https://images.unsplash.com/photo-1504307651254-35680f356dfd?auto=format&fit=crop&w=400&q=80' },
      { phone: '+919100000002', name: 'Welding Electrode 6013', description: 'Pack of 25 mild steel electrodes', category: 'Welding Supplies', price: '45.00', mrp: '55.00', image: 'https://images.unsplash.com/photo-1581092918056-0c4c3acd3789?auto=format&fit=crop&w=400&q=80' },
      { phone: '+919100000002', name: 'Arc Welding Machine 200A', description: 'Portable inverter welding machine', category: 'Welding Supplies', price: '2800.00', mrp: '3200.00', image: 'https://images.unsplash.com/photo-1618220179857-7c76a6b50e6d?auto=format&fit=crop&w=400&q=80' },
      { phone: '+919100000002', name: 'Fibre Sheet 10x4ft', description: 'Corrugated fibre cement roofing sheet', category: 'Roofing Materials', price: '280.00', image: 'https://images.unsplash.com/photo-1504307651254-35680f356dfd?auto=format&fit=crop&w=400&q=80' },
      { phone: '+919100000002', name: 'Waterproofing Chemical 5L', description: 'Dr Fixit waterproof coating, 5L', category: 'Waterproofing', price: '350.00', mrp: '420.00', image: 'https://images.unsplash.com/photo-1610701596007-11502861dcfa?auto=format&fit=crop&w=400&q=80' },
      { phone: '+919100000002', name: 'Block Level Laser', description: '3-line self-leveling laser level', category: 'Measuring Tools', price: '650.00', image: 'https://images.unsplash.com/photo-1572981779307-38b8cabb2407?auto=format&fit=crop&w=400&q=80' },
      { phone: '+919100000002', name: 'Crow Bar 3ft', description: 'High carbon steel pry bar/crow bar', category: 'Hand Tools', price: '55.00', image: 'https://images.unsplash.com/photo-1530124566582-a618bc2615dc?auto=format&fit=crop&w=400&q=80' },
      { phone: '+919100000002', name: 'Paint Spray Gun', description: 'HVLP air spray gun, 600ml cup', category: 'Painting Tools', price: '280.00', mrp: '350.00', image: 'https://images.unsplash.com/photo-1610701596007-11502861dcfa?auto=format&fit=crop&w=400&q=80' },
      { phone: '+919100000002', name: 'Tarpaulin Sheet 12x18ft', description: 'Heavy-duty UV-resistant blue tarpaulin', category: 'Construction Materials', price: '120.00', image: 'https://images.unsplash.com/photo-1504307651254-35680f356dfd?auto=format&fit=crop&w=400&q=80' },
      { phone: '+919100000002', name: 'Bolt & Nut Set M8', description: 'Zinc-plated M8 bolts & nuts, 50 sets', category: 'Fasteners', price: '35.00', image: 'https://images.unsplash.com/photo-1587145820098-4b6bea20e3cc?auto=format&fit=crop&w=400&q=80' },
    ];

    for (const p of hardwareProducts) {
      const sellerId = hardwareSellers[p.phone]?.id;
      if (sellerId) {
        const { phone, ...rest } = p;
        await upsertProduct({ sellerId, ...rest });
      }
    }

    // ────────────────────────────────
    // SPORTS SHOP PRODUCTS
    // ────────────────────────────────
    const sportsProducts: Array<{ phone: string; name: string; description: string; category: string; price: string; mrp?: string; image: string }> = [
      // Champion Sports (+919200000001)
      { phone: '+919200000001', name: 'Cricket Bat Kashmir Willow', description: 'Grade 1 Kashmir willow, full-size bat', category: 'Cricket', price: '650.00', mrp: '850.00', image: 'https://images.unsplash.com/photo-1531415074968-036ba1b575da?auto=format&fit=crop&w=400&q=80' },
      { phone: '+919200000001', name: 'Leather Cricket Ball (3-pack)', description: 'Red seam leather ball, match quality', category: 'Cricket', price: '250.00', image: 'https://images.unsplash.com/photo-1531415074968-036ba1b575da?auto=format&fit=crop&w=400&q=80' },
      { phone: '+919200000001', name: 'Cricket Batting Gloves', description: 'SG-style full-finger batting gloves', category: 'Cricket', price: '350.00', mrp: '450.00', image: 'https://images.unsplash.com/photo-1561731216-c3a4d99437d5?auto=format&fit=crop&w=400&q=80' },
      { phone: '+919200000001', name: 'Cricket Helmet', description: 'Steel grill helmet, adjustable', category: 'Cricket', price: '800.00', image: 'https://images.unsplash.com/photo-1531415074968-036ba1b575da?auto=format&fit=crop&w=400&q=80' },
      { phone: '+919200000001', name: 'Badminton Racket', description: 'Yonex-style graphite frame racket', category: 'Badminton', price: '550.00', mrp: '700.00', image: 'https://images.unsplash.com/photo-1626224583764-f87db24ac4ea?auto=format&fit=crop&w=400&q=80' },
      { phone: '+919200000001', name: 'Shuttlecock (6-pack Feather)', description: 'Genuine feather shuttlecocks', category: 'Badminton', price: '180.00', image: 'https://images.unsplash.com/photo-1626224583764-f87db24ac4ea?auto=format&fit=crop&w=400&q=80' },
      { phone: '+919200000001', name: 'Football Size 5', description: 'Durable PU match football', category: 'Football', price: '350.00', mrp: '450.00', image: 'https://images.unsplash.com/photo-1579952363873-27f3bade9f55?auto=format&fit=crop&w=400&q=80' },
      { phone: '+919200000001', name: 'Football Shin Guards', description: 'Lightweight EVA foam shin guards', category: 'Football', price: '120.00', image: 'https://images.unsplash.com/photo-1579952363873-27f3bade9f55?auto=format&fit=crop&w=400&q=80' },
      { phone: '+919200000001', name: 'Sports Water Bottle 1L', description: 'BPA-free double-wall insulated bottle', category: 'Accessories', price: '80.00', mrp: '120.00', image: 'https://images.unsplash.com/photo-1523362628745-0c100150b504?auto=format&fit=crop&w=400&q=80' },
      { phone: '+919200000001', name: 'Sports Bag Backpack', description: 'Multi-pocket 30L sports duffel', category: 'Accessories', price: '500.00', image: 'https://images.unsplash.com/photo-1553062407-98eeb64c6a62?auto=format&fit=crop&w=400&q=80' },

      // FitZone Equipment (+919200000002)
      { phone: '+919200000002', name: 'Dumbbell Set 5–20kg', description: 'Hex rubber dumbbell set, 5 pairs', category: 'Gym Equipment', price: '3500.00', mrp: '4500.00', image: 'https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?auto=format&fit=crop&w=400&q=80' },
      { phone: '+919200000002', name: 'Resistance Bands Set', description: '5 levels, loop & long bands included', category: 'Gym Equipment', price: '350.00', mrp: '500.00', image: 'https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?auto=format&fit=crop&w=400&q=80' },
      { phone: '+919200000002', name: 'Yoga Mat 6mm', description: 'Non-slip TPE eco yoga mat with strap', category: 'Yoga & Fitness', price: '450.00', image: 'https://images.unsplash.com/photo-1506126613408-eca07ce68773?auto=format&fit=crop&w=400&q=80' },
      { phone: '+919200000002', name: 'Skipping Rope Bearing', description: 'Ball bearing steel cable speed rope', category: 'Cardio Equipment', price: '250.00', mrp: '350.00', image: 'https://images.unsplash.com/photo-1434682881908-b43d0467b798?auto=format&fit=crop&w=400&q=80' },
      { phone: '+919200000002', name: 'Pull-Up Bar Doorframe', description: 'Multi-grip doorframe pull-up bar', category: 'Gym Equipment', price: '800.00', image: 'https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?auto=format&fit=crop&w=400&q=80' },
      { phone: '+919200000002', name: 'Gym Gloves', description: 'Half-finger weight training gloves', category: 'Gym Equipment', price: '180.00', mrp: '250.00', image: 'https://images.unsplash.com/photo-1561731216-c3a4d99437d5?auto=format&fit=crop&w=400&q=80' },
      { phone: '+919200000002', name: 'Foam Roller 60cm', description: 'High-density EVA muscle recovery roller', category: 'Recovery', price: '350.00', image: 'https://images.unsplash.com/photo-1506126613408-eca07ce68773?auto=format&fit=crop&w=400&q=80' },
      { phone: '+919200000002', name: 'Kettlebell 16kg', description: 'Cast iron powder-coated kettlebell', category: 'Gym Equipment', price: '1200.00', mrp: '1500.00', image: 'https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?auto=format&fit=crop&w=400&q=80' },
      { phone: '+919200000002', name: 'Gym Belt Leather', description: '4 inch wide leather weightlifting belt', category: 'Gym Equipment', price: '550.00', image: 'https://images.unsplash.com/photo-1561731216-c3a4d99437d5?auto=format&fit=crop&w=400&q=80' },
      { phone: '+919200000002', name: 'Ab Wheel Roller', description: 'Double-wheel ab roller with knee mat', category: 'Gym Equipment', price: '250.00', mrp: '350.00', image: 'https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?auto=format&fit=crop&w=400&q=80' },

      // PlayMore Sports (+919200000003)
      { phone: '+919200000003', name: 'Basketball Size 7', description: 'Outdoor rubber basketball, grip texture', category: 'Basketball', price: '400.00', mrp: '550.00', image: 'https://images.unsplash.com/photo-1546519638405-a9f9f16d7248?auto=format&fit=crop&w=400&q=80' },
      { phone: '+919200000003', name: 'Basketball Net Replacement', description: 'All-weather nylon hoop net', category: 'Basketball', price: '80.00', image: 'https://images.unsplash.com/photo-1546519638405-a9f9f16d7248?auto=format&fit=crop&w=400&q=80' },
      { phone: '+919200000003', name: 'Table Tennis Set', description: '2 bats, 6 balls, net & post set', category: 'Table Tennis', price: '350.00', mrp: '480.00', image: 'https://images.unsplash.com/photo-1611251135345-18c56206b863?auto=format&fit=crop&w=400&q=80' },
      { phone: '+919200000003', name: 'TT Rubber Sheet Pro', description: 'High-tension speed rubber, ITTF approved', category: 'Table Tennis', price: '280.00', image: 'https://images.unsplash.com/photo-1611251135345-18c56206b863?auto=format&fit=crop&w=400&q=80' },
      { phone: '+919200000003', name: 'Volleyball Match', description: 'Mikasa-style 18-panel volleyball', category: 'Volleyball', price: '380.00', mrp: '500.00', image: 'https://images.unsplash.com/photo-1612872087720-bb876e2e67d1?auto=format&fit=crop&w=400&q=80' },
      { phone: '+919200000003', name: 'Volleyball Net 9.5m', description: 'Official size steel cable volleyball net', category: 'Volleyball', price: '450.00', image: 'https://images.unsplash.com/photo-1612872087720-bb876e2e67d1?auto=format&fit=crop&w=400&q=80' },
      { phone: '+919200000003', name: 'Running Shoes Size 8-11', description: 'Lightweight mesh running shoes, unisex', category: 'Footwear', price: '1200.00', mrp: '1600.00', image: 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?auto=format&fit=crop&w=400&q=80' },
      { phone: '+919200000003', name: 'Sports Socks (6-pair)', description: 'Cushioned ankle sports socks pack', category: 'Apparel', price: '150.00', image: 'https://images.unsplash.com/photo-1523362628745-0c100150b504?auto=format&fit=crop&w=400&q=80' },
      { phone: '+919200000003', name: 'Knee Support Brace', description: 'Neoprene adjustable knee support', category: 'Injury Support', price: '220.00', mrp: '300.00', image: 'https://images.unsplash.com/photo-1561731216-c3a4d99437d5?auto=format&fit=crop&w=400&q=80' },
      { phone: '+919200000003', name: 'Sports First Aid Kit', description: 'Compact 30-piece sports first aid kit', category: 'Accessories', price: '250.00', image: 'https://images.unsplash.com/photo-1530124566582-a618bc2615dc?auto=format&fit=crop&w=400&q=80' },

      // Victory Sports Arena (+919200000004)
      { phone: '+919200000004', name: 'Treadmill Manual', description: 'Foldable manual treadmill, 100kg capacity', category: 'Cardio Equipment', price: '8500.00', mrp: '11000.00', image: 'https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?auto=format&fit=crop&w=400&q=80' },
      { phone: '+919200000004', name: 'Exercise Cycle Upright', description: 'Magnetic resistance upright cycle', category: 'Cardio Equipment', price: '6500.00', mrp: '8000.00', image: 'https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?auto=format&fit=crop&w=400&q=80' },
      { phone: '+919200000004', name: 'Barbell Set 50kg', description: 'Olympic style barbell + weight plates', category: 'Gym Equipment', price: '4500.00', mrp: '5500.00', image: 'https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?auto=format&fit=crop&w=400&q=80' },
      { phone: '+919200000004', name: 'Boxing Gloves 12oz', description: 'Genuine leather training boxing gloves', category: 'Boxing & MMA', price: '1200.00', mrp: '1600.00', image: 'https://images.unsplash.com/photo-1544367567-0f2fcb009e0b?auto=format&fit=crop&w=400&q=80' },
      { phone: '+919200000004', name: 'Punching Bag 4ft', description: 'Heavy canvas bag with chain hanger', category: 'Boxing & MMA', price: '2200.00', mrp: '2800.00', image: 'https://images.unsplash.com/photo-1544367567-0f2fcb009e0b?auto=format&fit=crop&w=400&q=80' },
      { phone: '+919200000004', name: 'Hockey Stick FG', description: 'Carbon fibre field hockey stick', category: 'Hockey', price: '1800.00', mrp: '2200.00', image: 'https://images.unsplash.com/photo-1531415074968-036ba1b575da?auto=format&fit=crop&w=400&q=80' },
      { phone: '+919200000004', name: 'Lawn Tennis Racket', description: 'Graphite frame with string & grip', category: 'Tennis', price: '1500.00', mrp: '2000.00', image: 'https://images.unsplash.com/photo-1622279457486-62dcc4a431d6?auto=format&fit=crop&w=400&q=80' },
      { phone: '+919200000004', name: 'Tennis Balls (4-pack)', description: 'All-court pressurized tennis balls', category: 'Tennis', price: '180.00', image: 'https://images.unsplash.com/photo-1622279457486-62dcc4a431d6?auto=format&fit=crop&w=400&q=80' },
      { phone: '+919200000004', name: 'Swimming Goggles', description: 'Anti-fog UV-protected swim goggles', category: 'Swimming', price: '350.00', mrp: '500.00', image: 'https://images.unsplash.com/photo-1530549387789-4c1017266635?auto=format&fit=crop&w=400&q=80' },
      { phone: '+919200000004', name: 'Cycling Helmet Adult', description: 'CPSC certified road cycling helmet', category: 'Cycling', price: '900.00', mrp: '1200.00', image: 'https://images.unsplash.com/photo-1544191696-102dbeb5ac79?auto=format&fit=crop&w=400&q=80' },
    ];

    for (const p of sportsProducts) {
      const sellerId = sportsSellers[p.phone]?.id;
      if (sellerId) {
        const { phone, ...rest } = p;
        await upsertProduct({ sellerId, ...rest });
      }
    }

    console.log('✅ Products seeded');

    // ──────────────────────────────────────────────
    // DELIVERY PARTNERS
    // ──────────────────────────────────────────────
    console.log('Seeding delivery partners...');

    await prisma.deliveryPartner.upsert({
      where: { providerName: 'dunzo' },
      update: {},
      create: {
        providerName: 'dunzo',
        displayName: 'Dunzo',
        apiUrl: 'https://api.dunzo.com/v1',
        apiKey: process.env.DUNZO_API_KEY || 'demo-key-dunzo',
        apiSecret: process.env.DUNZO_API_SECRET,
        isActive: true,
        priority: 0,
        baseFeeRupees: 50,
        perKmRupees: 10,
        minChargeRupees: 50,
        avgDeliveryMins: 22,
        successRate: 99.5,
        supportPhone: '+91-8080-808-080',
        supportEmail: 'support@dunzo.com',
      },
    });

    await prisma.deliveryPartner.upsert({
      where: { providerName: 'porter' },
      update: {},
      create: {
        providerName: 'porter',
        displayName: 'Porter',
        apiUrl: 'https://api.porter.in/v1',
        apiKey: process.env.PORTER_API_KEY || 'demo-key-porter',
        apiSecret: process.env.PORTER_API_SECRET,
        isActive: true,
        priority: 1,
        baseFeeRupees: 60,
        perKmRupees: 12,
        minChargeRupees: 60,
        avgDeliveryMins: 18,
        successRate: 99.2,
        supportPhone: '+91-7298-887-700',
        supportEmail: 'support@porter.in',
      },
    });

    await prisma.deliveryPartner.upsert({
      where: { providerName: 'uber_direct' },
      update: {},
      create: {
        providerName: 'uber_direct',
        displayName: 'Uber Direct',
        apiUrl: 'https://api.uber.com/v1/delivery',
        apiKey: process.env.UBER_API_KEY || 'demo-key-uber',
        apiSecret: process.env.UBER_API_SECRET,
        isActive: true,
        priority: 2,
        baseFeeRupees: 45,
        perKmRupees: 11,
        minChargeRupees: 45,
        avgDeliveryMins: 25,
        successRate: 98.8,
        supportPhone: '+91-8000-2040-1111',
        supportEmail: 'support@uber.com',
      },
    });

    console.log('✅ Delivery partners seeded');

    // ──────────────────────────────────────────────
    // MULTI-CART SAMPLE DATA (SEED)
    // ──────────────────────────────────────────────
    console.log('Seeding multi-cart data...');

    // Get test user and first 2 sellers
    const testUser = await prisma.user.findUnique({
      where: { phone: '+911234567890' },
    });

    if (testUser) {
      const sellers = await prisma.seller.findMany({
        take: 2,
      });

      // Create sample carts for each seller
      for (let i = 0; i < sellers.length; i++) {
        // Check if cart already exists
                let cart = await prisma.cart.findUnique({
          where: { userId: testUser.id },
        });

        if (!cart) {
          cart = await prisma.cart.create({
            data: {
              userId: testUser.id,
              status: 'active',
            },
          });
        }

        // Add 2-3 sample items to each cart
        const products = await prisma.product.findMany({
          where: { sellerId: sellers[i].id },
          take: 3,
        });

        for (let j = 0; j < products.length; j++) {
            await prisma.cartItem.create({
              data: {
                cartId: cart.id,
                productId: products[j].id,
                sellerId: sellers[i].id,
                quantity: 1 + j,
                payload: {},
                priceAtAdd: new Decimal(products[j].price?.toString() || '0'),
              },
            });
        }
      }
    }

    console.log('✅ Multi-cart data seeded');

    console.log('\n🎉 Database seeded successfully!');
  } catch (error) {
    console.error('Error seeding database:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
    await pool.end();
  }

  // Import Decimal at the top of the file for priceAtAdd field
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});