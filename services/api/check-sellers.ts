import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  throw new Error('DATABASE_URL environment variable is not set');
}

const pool = new Pool({ connectionString });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

(async () => {
  const sellers = await prisma.seller.findMany({
    include: { categories: true },
    orderBy: { createdAt: 'desc' }
  });
  
  console.log('\n=== SEEDED SELLERS ===\n');
  console.log(`Total sellers: ${sellers.length}\n`);
  
  sellers.forEach((s, i) => {
    console.log(`${i + 1}. ${s.shopName}`);
    console.log(`   Status: ${s.status}`);
    console.log(`   Location: Lat ${s.latitude}, Lng ${s.longitude}`);
    console.log(`   Categories: ${s.categories.map(c => c.categoryId).join(', ')}`);
    console.log('');
  });

  // Check distance from query location
  const queryLat = 28.6139;
  const queryLng = 77.209;
  
  console.log(`\n=== DISTANCE FROM QUERY LOCATION (${queryLat}, ${queryLng}) ===\n`);
  sellers.forEach((s) => {
    const distance = calculateDistance(queryLat, queryLng, Number(s.latitude), Number(s.longitude));
    console.log(`${s.shopName}: ${distance.toFixed(2)}km (Status: ${s.status})`);
  });

  await prisma.$disconnect();
  await pool.end();
})();

function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371; // Radius of the Earth in km
  const dLat = (lat2 - lat1) * (Math.PI / 180);
  const dLon = (lon2 - lon1) * (Math.PI / 180);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * (Math.PI / 180)) *
      Math.cos(lat2 * (Math.PI / 180)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}
