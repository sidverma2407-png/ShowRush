import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';
import { Pool } from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.join(__dirname, '../.env') });
const connectionString = process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/seatzy?schema=public';
const pool = new Pool({ connectionString });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  console.log('Seeding database with initial data...');
  
  // Create roles
  const password_hash = await bcrypt.hash('password123', 10);
  
  const admin = await prisma.user.upsert({
    where: { email: 'admin@seatzy.com' },
    update: {},
    create: { name: 'Admin User', email: 'admin@seatzy.com', password_hash, role: 'admin' }
  });
  
  const organiser = await prisma.user.upsert({
    where: { email: 'organiser@seatzy.com' },
    update: {},
    create: { name: 'Organiser User', email: 'organiser@seatzy.com', password_hash, role: 'organiser' }
  });

  // Create seat categories
  const vipCategory = await prisma.seatCategory.create({ data: { name: 'VIP' } });
  const regularCategory = await prisma.seatCategory.create({ data: { name: 'Regular' } });

  // Create venue
  const venue = await prisma.venue.create({
    data: { name: 'Seatzy Grand Arena', address: '123 Neo Blvd', created_by: admin.id }
  });

  // Create venue seats (2 rows, 5 seats each)
  const seatsData = [];
  for (let i = 1; i <= 5; i++) {
    seatsData.push({ venue_id: venue.id, row_label: 'A', seat_number: i, category_id: vipCategory.id });
    seatsData.push({ venue_id: venue.id, row_label: 'B', seat_number: i, category_id: regularCategory.id });
  }
  await prisma.venueSeat.createMany({ data: seatsData });

  // Create event
  const event = await prisma.event.create({
    data: { 
      organiser_id: organiser.id, 
      title: 'The Neo-Brutalism Concert', 
      type: 'concert', 
      description: 'A spectacular audio-visual experience featuring high contrast colors and brutalist soundscapes.',
      poster_url: 'https://images.unsplash.com/photo-1540039155732-6847350357a5?q=80&w=2070&auto=format&fit=crop'
    }
  });

  // Create show
  const showDate = new Date();
  showDate.setDate(showDate.getDate() + 7); // 7 days from now
  const show = await prisma.show.create({
    data: { event_id: event.id, venue_id: venue.id, date: showDate, time: '20:00' }
  });

  // Create pricing
  await prisma.showCategoryPricing.createMany({
    data: [
      { show_id: show.id, category_id: vipCategory.id, price: 150.00 },
      { show_id: show.id, category_id: regularCategory.id, price: 50.00 }
    ]
  });

  // Generate initial seat statuses
  const venueSeats = await prisma.venueSeat.findMany({ where: { venue_id: venue.id } });
  await prisma.seatStatus.createMany({
    data: venueSeats.map(seat => ({
      show_id: show.id,
      venue_seat_id: seat.id,
      status: 'available'
    }))
  });

  console.log('Database seeded successfully!');
}

main()
  .catch(e => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
