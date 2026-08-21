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
  console.log('Clearing old data and seeding database with specialized multi-venue layouts...');

  // Clean wipe tables for fresh layout seeding
  await prisma.$executeRawUnsafe(`TRUNCATE TABLE "bookings", "booking_seats", "waitlist_entries", "seat_status", "show_category_pricing", "shows", "events", "venue_seats", "seat_categories", "venues" CASCADE;`);

  // Create users
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

  // Helper to ensure seat category exists
  async function getCategory(name: string) {
    let cat = await prisma.seatCategory.findFirst({ where: { name } });
    if (!cat) {
      cat = await prisma.seatCategory.create({ data: { name } });
    }
    return cat;
  }

  // Create Seat Categories
  const vipPitCat = await getCategory('VIP Pit');
  const goldenCircleCat = await getCategory('Golden Circle');
  const lowerTierCat = await getCategory('Lower Tier');
  const upperDeckCat = await getCategory('Upper Deck');
  const reclinerCat = await getCategory('Executive Recliner');
  const premiumCat = await getCategory('Premium Club');
  const standardCat = await getCategory('Standard');
  const vipPavilionCat = await getCategory('VIP Pavilion');
  const generalComedyCat = await getCategory('General Admission');

  // --- VENUE 1: Grand Cinema Multiplex (For Movies) ---
  const cinemaVenue = await prisma.venue.create({
    data: { name: 'Seatzy Grand Cinema', address: '456 Hollywood Blvd', created_by: admin.id }
  });

  const cinemaSeats = [];
  const cinemaRows = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H'];
  for (let r = 0; r < cinemaRows.length; r++) {
    const rowLabel = cinemaRows[r];
    let categoryId = standardCat.id;
    if (r >= 2 && r <= 5) categoryId = premiumCat.id;
    if (r >= 6) categoryId = reclinerCat.id;

    for (let i = 1; i <= 14; i++) {
      cinemaSeats.push({
        venue_id: cinemaVenue.id,
        row_label: rowLabel,
        seat_number: i,
        category_id: categoryId
      });
    }
  }
  await prisma.venueSeat.createMany({ data: cinemaSeats });

  // --- VENUE 2: Travis Scott Stadium Arena (For Concerts) ---
  const stadiumVenue = await prisma.venue.create({
    data: { name: 'Travis Scott Stadium Arena', address: '789 AstroWorld Way', created_by: admin.id }
  });

  const stadiumSeats = [];
  ['A', 'B'].forEach(row => {
    for (let i = 1; i <= 12; i++) stadiumSeats.push({ venue_id: stadiumVenue.id, row_label: row, seat_number: i, category_id: vipPitCat.id });
  });
  ['C', 'D', 'E'].forEach(row => {
    for (let i = 1; i <= 14; i++) stadiumSeats.push({ venue_id: stadiumVenue.id, row_label: row, seat_number: i, category_id: goldenCircleCat.id });
  });
  ['F', 'G', 'H'].forEach(row => {
    for (let i = 1; i <= 16; i++) stadiumSeats.push({ venue_id: stadiumVenue.id, row_label: row, seat_number: i, category_id: lowerTierCat.id });
  });
  ['I', 'J', 'K'].forEach(row => {
    for (let i = 1; i <= 16; i++) stadiumSeats.push({ venue_id: stadiumVenue.id, row_label: row, seat_number: i, category_id: upperDeckCat.id });
  });
  await prisma.venueSeat.createMany({ data: stadiumSeats });

  // --- VENUE 3: Seatzy Underground Comedy Club (For Comedy) ---
  const comedyVenue = await prisma.venue.create({
    data: { name: 'Seatzy Underground Comedy Club', address: '123 Laugh Corner', created_by: admin.id }
  });

  const comedySeats = [];
  const comedyRows = ['A', 'B', 'C', 'D', 'E', 'F'];
  for (let r = 0; r < comedyRows.length; r++) {
    for (let i = 1; i <= 12; i++) {
      comedySeats.push({ venue_id: comedyVenue.id, row_label: comedyRows[r], seat_number: i, category_id: generalComedyCat.id });
    }
  }
  await prisma.venueSeat.createMany({ data: comedySeats });

  // --- VENUE 4: Metropolitan Cricket Stadium (For Cricket Sports Events) ---
  const cricketVenue = await prisma.venue.create({
    data: { name: 'Metropolitan Cricket Stadium', address: '100 Pitch Oval Way', created_by: admin.id }
  });

  const cricketSeats = [];
  ['A', 'B'].forEach(row => {
    for (let i = 1; i <= 12; i++) cricketSeats.push({ venue_id: cricketVenue.id, row_label: row, seat_number: i, category_id: vipPavilionCat.id });
  });
  ['C', 'D', 'E'].forEach(row => {
    for (let i = 1; i <= 14; i++) cricketSeats.push({ venue_id: cricketVenue.id, row_label: row, seat_number: i, category_id: lowerTierCat.id });
  });
  ['F', 'G', 'H'].forEach(row => {
    for (let i = 1; i <= 16; i++) cricketSeats.push({ venue_id: cricketVenue.id, row_label: row, seat_number: i, category_id: upperDeckCat.id });
  });
  await prisma.venueSeat.createMany({ data: cricketSeats });

  // --- VENUE 5: National Soccer Arena (For Football Sports Events) ---
  const footballVenue = await prisma.venue.create({
    data: { name: 'National Soccer Arena', address: '500 Goalpost Blvd', created_by: admin.id }
  });

  const footballSeats = [];
  ['A', 'B'].forEach(row => {
    for (let i = 1; i <= 12; i++) footballSeats.push({ venue_id: footballVenue.id, row_label: row, seat_number: i, category_id: vipPavilionCat.id });
  });
  ['C', 'D', 'E'].forEach(row => {
    for (let i = 1; i <= 14; i++) footballSeats.push({ venue_id: footballVenue.id, row_label: row, seat_number: i, category_id: lowerTierCat.id });
  });
  ['F', 'G', 'H'].forEach(row => {
    for (let i = 1; i <= 16; i++) footballSeats.push({ venue_id: footballVenue.id, row_label: row, seat_number: i, category_id: upperDeckCat.id });
  });
  await prisma.venueSeat.createMany({ data: footballSeats });

  // --- 20 EVENTS WITH MATCHING THEMATIC POSTER IMAGES ---
  const eventData = [
    // MOVIES
    {
      title: 'Neon Chronicles',
      type: 'movie',
      description: 'A cyberpunk neo-noir film set in a dystopian future where human memories are traded as currency.',
      poster_url: 'https://images.unsplash.com/photo-1542751371-adc38448a05e?auto=format&fit=crop&w=800&q=80'
    },
    {
      title: 'The Last Voyage',
      type: 'movie',
      description: 'A sci-fi epic following a lone starship searching for a new habitable world.',
      poster_url: 'https://images.unsplash.com/photo-1451187580459-43490279c0fa?auto=format&fit=crop&w=800&q=80'
    },
    {
      title: 'Midnight Paradox',
      type: 'movie',
      description: 'A gripping mystery thriller that twists the fabric of time.',
      poster_url: 'https://images.unsplash.com/photo-1509198397868-475647b2a1e5?auto=format&fit=crop&w=800&q=80'
    },
    {
      title: 'Echoes of Eternity',
      type: 'movie',
      description: 'A sweeping fantasy epic detailing the fall of an ancient magical empire.',
      poster_url: 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?auto=format&fit=crop&w=800&q=80'
    },
    {
      title: 'Velocity Shift',
      type: 'movie',
      description: 'High octane racing action across neon-lit city streets.',
      poster_url: 'https://images.unsplash.com/photo-1568605117036-5fe5e7bab0b7?auto=format&fit=crop&w=800&q=80'
    },

    // CONCERTS
    {
      title: 'Electric Symphony',
      type: 'concert',
      description: 'A massive EDM festival featuring cutting-edge laser shows and massive drops.',
      poster_url: 'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?auto=format&fit=crop&w=800&q=80'
    },
    {
      title: 'Echoes of the Underground',
      type: 'concert',
      description: 'An intimate indie rock gig showcasing the best upcoming bands.',
      poster_url: 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?auto=format&fit=crop&w=800&q=80'
    },
    {
      title: 'Jazz Under the Stars',
      type: 'concert',
      description: 'Smooth and elegant jazz performance under an open sky.',
      poster_url: 'https://images.unsplash.com/photo-1511192336575-5a79af67a629?auto=format&fit=crop&w=800&q=80'
    },
    {
      title: 'Bass Drop Riot',
      type: 'concert',
      description: 'Heavy dubstep and bass music that will shake the floor.',
      poster_url: 'https://images.unsplash.com/photo-1516450360452-9312f5e86fc7?auto=format&fit=crop&w=800&q=80'
    },
    {
      title: 'The Golden Era Tour',
      type: 'concert',
      description: 'A tribute to the greatest classic rock anthems of the 70s and 80s.',
      poster_url: 'https://images.unsplash.com/photo-1465847899084-d164df4dedc6?auto=format&fit=crop&w=800&q=80'
    },

    // COMEDY
    {
      title: 'Laugh Riot: Unfiltered',
      type: 'comedy',
      description: 'No holds barred standup comedy from the best rising stars.',
      poster_url: 'https://images.unsplash.com/photo-1585699324551-f6c309eedeca?auto=format&fit=crop&w=800&q=80'
    },
    {
      title: 'The Daily Roast',
      type: 'comedy',
      description: 'A brutal and hilarious roast battle between top comedians.',
      poster_url: 'https://images.unsplash.com/photo-1527269534026-c86f54994082?auto=format&fit=crop&w=800&q=80'
    },
    {
      title: 'Chuckles & Cheers',
      type: 'comedy',
      description: 'A family-friendly improv show filled with unexpected turns.',
      poster_url: 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?auto=format&fit=crop&w=800&q=80'
    },
    {
      title: 'Stand-Up Showdown',
      type: 'comedy',
      description: 'Comedians face off to win the ultimate title in a boxing-ring style stage.',
      poster_url: 'https://images.unsplash.com/photo-1485579149621-3123dd979885?auto=format&fit=crop&w=800&q=80'
    },
    {
      title: 'Midnight Giggles',
      type: 'comedy',
      description: 'A late-night special featuring dark humor and satire.',
      poster_url: 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?auto=format&fit=crop&w=800&q=80'
    },

    // SPORTS
    {
      title: 'T20 Premier Cricket League Derby',
      type: 'sports',
      subType: 'cricket',
      description: 'High stakes T20 Cricket derby with boundary sixes and electric crowd.',
      poster_url: 'https://images.unsplash.com/photo-1531415074968-036ba1b575da?auto=format&fit=crop&w=800&q=80'
    },
    {
      title: 'Champions Trophy Football Final',
      type: 'sports',
      subType: 'football',
      description: 'The ultimate soccer showdown under stadium floodlights.',
      poster_url: 'https://images.unsplash.com/photo-1508098682722-e99c43a406b2?auto=format&fit=crop&w=800&q=80'
    },
    {
      title: 'World Cricket Super Clash',
      type: 'sports',
      subType: 'cricket',
      description: 'International cricket heavyweights clash on the central pitch.',
      poster_url: 'https://images.unsplash.com/photo-1540747913346-19e32dc3e97e?auto=format&fit=crop&w=800&q=80'
    },
    {
      title: 'Gridiron Football Championship',
      type: 'sports',
      subType: 'football',
      description: 'Two massive rival football teams face off in the grand stadium.',
      poster_url: 'https://images.unsplash.com/photo-1566577739112-5180d4bf9390?auto=format&fit=crop&w=800&q=80'
    },
    {
      title: 'Apex Fight Championship',
      type: 'sports',
      subType: 'boxing',
      description: 'The premier championship fight event of the year.',
      poster_url: 'https://images.unsplash.com/photo-1517649763962-0c623266010b?auto=format&fit=crop&w=800&q=80'
    }
  ];

  for (let i = 0; i < eventData.length; i++) {
    const ev = eventData[i];
    const event = await prisma.event.create({
      data: {
        organiser_id: organiser.id,
        title: ev.title,
        type: ev.type as any,
        description: ev.description,
        poster_url: ev.poster_url
      }
    });

    // Select venue based on event type & subType
    let chosenVenue = comedyVenue;
    if (ev.type === 'movie') chosenVenue = cinemaVenue;
    else if (ev.type === 'concert') chosenVenue = stadiumVenue;
    else if (ev.type === 'comedy') chosenVenue = comedyVenue;
    else if (ev.type === 'sports' && ev.subType === 'cricket') chosenVenue = cricketVenue;
    else if (ev.type === 'sports') chosenVenue = footballVenue;

    // Fetch venue seats
    const vSeats = await prisma.venueSeat.findMany({ where: { venue_id: chosenVenue.id } });

    // Create 3 random shows per event
    for (let s = 1; s <= 3; s++) {
      const showDate = new Date();
      showDate.setDate(showDate.getDate() + Math.floor(Math.random() * 60) + 1);
      const hours = ['18:00', '19:30', '20:00', '21:00', '22:00'];
      const randomTime = hours[Math.floor(Math.random() * hours.length)];

      const show = await prisma.show.create({
        data: { event_id: event.id, venue_id: chosenVenue.id, date: showDate, time: randomTime }
      });

      // Price mapping based on venue & categories
      const pricingData = [];
      if (ev.type === 'movie') {
        pricingData.push(
          { show_id: show.id, category_id: reclinerCat.id, price: 32.00 },
          { show_id: show.id, category_id: premiumCat.id, price: 22.00 },
          { show_id: show.id, category_id: standardCat.id, price: 15.00 }
        );
      } else if (ev.type === 'concert') {
        pricingData.push(
          { show_id: show.id, category_id: vipPitCat.id, price: 299.00 },
          { show_id: show.id, category_id: goldenCircleCat.id, price: 175.00 },
          { show_id: show.id, category_id: lowerTierCat.id, price: 110.00 },
          { show_id: show.id, category_id: upperDeckCat.id, price: 65.00 }
        );
      } else if (ev.type === 'comedy') {
        pricingData.push(
          { show_id: show.id, category_id: generalComedyCat.id, price: 35.00 }
        );
      } else if (ev.type === 'sports') {
        pricingData.push(
          { show_id: show.id, category_id: vipPavilionCat.id, price: 150.00 },
          { show_id: show.id, category_id: lowerTierCat.id, price: 85.00 },
          { show_id: show.id, category_id: upperDeckCat.id, price: 35.00 }
        );
      }

      await prisma.showCategoryPricing.createMany({ data: pricingData });

      // Create seat statuses for show
      await prisma.seatStatus.createMany({
        data: vSeats.map(seat => ({
          show_id: show.id,
          venue_seat_id: seat.id,
          status: 'available'
        }))
      });
    }
  }

  console.log('Database successfully re-seeded with 20 event-matched high-definition poster images!');
}

main()
  .catch(e => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
