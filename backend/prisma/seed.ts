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
  console.log('Clearing old data and seeding database with specialized multi-venue layouts & Indian cities...');

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

  // --- VENUE 1: Grand Cinema Multiplex (Delhi NCR) ---
  const cinemaVenue = await prisma.venue.create({
    data: { name: 'Seatzy Grand Cinema', address: 'Select CITYWALK, Saket', city: 'Delhi NCR', created_by: admin.id }
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

  // --- VENUE 2: Jio World Arena (Mumbai) ---
  const stadiumVenue = await prisma.venue.create({
    data: { name: 'Jio World Arena', address: 'Bandra Kurla Complex', city: 'Mumbai', created_by: admin.id }
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

  // --- VENUE 3: Seatzy Comedy Club (Bengaluru) ---
  const comedyVenue = await prisma.venue.create({
    data: { name: 'Seatzy Comedy Club', address: 'Koramangala 5th Block', city: 'Bengaluru', created_by: admin.id }
  });

  const comedySeats = [];
  const comedyRows = ['A', 'B', 'C', 'D', 'E', 'F'];
  for (let r = 0; r < comedyRows.length; r++) {
    for (let i = 1; i <= 12; i++) {
      comedySeats.push({ venue_id: comedyVenue.id, row_label: comedyRows[r], seat_number: i, category_id: generalComedyCat.id });
    }
  }
  await prisma.venueSeat.createMany({ data: comedySeats });

  // --- VENUE 4: Noida International Stadium (Noida) ---
  const cricketVenue = await prisma.venue.create({
    data: { name: 'Noida International Cricket Stadium', address: 'Sector 21A', city: 'Noida', created_by: admin.id }
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

  // --- VENUE 5: Balewadi Football Arena (Pune) ---
  const footballVenue = await prisma.venue.create({
    data: { name: 'Balewadi Football Arena', address: 'Shree Shiv Chhatrapati Sports Complex', city: 'Pune', created_by: admin.id }
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

  // --- 20 EVENTS WITH USER CUSTOM GENERATED POSTERS ---
  const eventData = [
    // MOVIES
    {
      title: 'Neon Chronicles',
      type: 'movie',
      description: 'A cyberpunk neo-noir sci-fi film set in a dystopian future where human memories are traded as currency.',
      poster_url: '/images/neon_movie.png'
    },
    {
      title: 'The Last Voyage',
      type: 'movie',
      description: 'A sci-fi epic following a lone starship searching for a new habitable world in uncharted galaxy.',
      poster_url: '/images/lost_voyage_movie.png'
    },
    {
      title: 'Midnight Paradox',
      type: 'movie',
      description: 'A gripping mystery thriller that twists the fabric of time and human consciousness.',
      poster_url: '/images/midnight_movie.png'
    },
    {
      title: 'Echoes of Eternity',
      type: 'movie',
      description: 'A sweeping fantasy epic detailing the fall of an ancient magical empire and rising hero.',
      poster_url: '/images/echoes_movie.png'
    },
    {
      title: 'Velocity Shift',
      type: 'movie',
      description: 'High octane street racing action across neon-lit city highways and illegal night tracks.',
      poster_url: '/images/velocity_movie.png'
    },

    // CONCERTS
    {
      title: 'Electric Symphony',
      type: 'concert',
      description: 'A massive EDM festival featuring cutting-edge laser shows, heavy drops, and 360-degree arena sound.',
      poster_url: '/images/electric_concert.png'
    },
    {
      title: 'Echoes of the Underground',
      type: 'concert',
      description: 'An intimate indie rock gig showcasing electric guitars and raw upcoming indie talent.',
      poster_url: '/images/underground_concert.png'
    },
    {
      title: 'Jazz Under the Stars',
      type: 'concert',
      description: 'Smooth and elegant saxophone jazz performance under a clear moonlit open sky.',
      poster_url: '/images/jazz_concert.png'
    },
    {
      title: 'Bass Drop Riot',
      type: 'concert',
      description: 'Heavy dubstep and bass music festival that will shake the stadium floor.',
      poster_url: '/images/bass_drop_concert.png'
    },
    {
      title: 'The Golden Era Tour',
      type: 'concert',
      description: 'A grand tribute concert celebrating the greatest classic rock anthems of all time.',
      poster_url: '/images/golden_concert.png'
    },

    // COMEDY
    {
      title: 'Laugh Riot: Unfiltered',
      type: 'comedy',
      description: 'No holds barred raw standup comedy from top national touring comedians.',
      poster_url: '/images/laugh_comedy.png'
    },
    {
      title: 'The Daily Roast',
      type: 'comedy',
      description: 'A brutal and hilarious roast battle featuring razor-sharp punchlines.',
      poster_url: '/images/roast_comedy.png'
    },
    {
      title: 'Chuckles & Cheers',
      type: 'comedy',
      description: 'A family-friendly improv comedy show filled with spontaneous laughs.',
      poster_url: '/images/chuckles_comedy.png'
    },
    {
      title: 'Stand-Up Showdown',
      type: 'comedy',
      description: 'Top comedians face off in a ring to win the ultimate title of comedy champion.',
      poster_url: '/images/standup_comedy.png'
    },
    {
      title: 'Midnight Giggles',
      type: 'comedy',
      description: 'A late-night comedy special featuring dark humor, satire, and unscripted crowd work.',
      poster_url: '/images/midnight_comedy.png'
    },

    // SPORTS
    {
      title: 'T20 Premier Cricket League Derby',
      type: 'sports',
      subType: 'cricket',
      description: 'High stakes T20 Cricket derby packed with boundary sixes and electric stadium energy.',
      poster_url: '/images/t20_sports.png'
    },
    {
      title: 'Champions Trophy Football Final',
      type: 'sports',
      subType: 'football',
      description: 'The ultimate football championship match under intense stadium floodlights.',
      poster_url: '/images/champions_sports.png'
    },
    {
      title: 'World Cricket Super Clash',
      type: 'sports',
      subType: 'cricket',
      description: 'International cricket powerhouses clash live on the central pitch.',
      poster_url: '/images/world_sports.png'
    },
    {
      title: 'Gridiron Football Championship',
      type: 'sports',
      subType: 'football',
      description: 'Two massive rival football clubs battle for the trophy on the pitch.',
      poster_url: '/images/gridiron_sports.png'
    },
    {
      title: 'Apex Fight Championship',
      type: 'sports',
      subType: 'boxing',
      description: 'The premier MMA boxing ring championship fight event of the year.',
      poster_url: '/images/apex_sports.png'
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

      // Price mapping in Indian Rupees (₹)
      const pricingData = [];
      if (ev.type === 'movie') {
        pricingData.push(
          { show_id: show.id, category_id: reclinerCat.id, price: 450.00 },
          { show_id: show.id, category_id: premiumCat.id, price: 300.00 },
          { show_id: show.id, category_id: standardCat.id, price: 200.00 }
        );
      } else if (ev.type === 'concert') {
        pricingData.push(
          { show_id: show.id, category_id: vipPitCat.id, price: 2500.00 },
          { show_id: show.id, category_id: goldenCircleCat.id, price: 1800.00 },
          { show_id: show.id, category_id: lowerTierCat.id, price: 1200.00 },
          { show_id: show.id, category_id: upperDeckCat.id, price: 650.00 }
        );
      } else if (ev.type === 'comedy') {
        pricingData.push(
          { show_id: show.id, category_id: generalComedyCat.id, price: 350.00 }
        );
      } else if (ev.type === 'sports') {
        pricingData.push(
          { show_id: show.id, category_id: vipPavilionCat.id, price: 1500.00 },
          { show_id: show.id, category_id: lowerTierCat.id, price: 850.00 },
          { show_id: show.id, category_id: upperDeckCat.id, price: 400.00 }
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

  console.log('Database successfully seeded with user custom posters, Indian cities, and INR pricing!');
}

main()
  .catch(e => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
