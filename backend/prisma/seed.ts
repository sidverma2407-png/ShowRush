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
  console.log('Clearing old data and seeding database with realistic August 23, 2026+ events & iconic venues...');

  // Clean wipe tables for fresh layout seeding
  await prisma.$executeRawUnsafe(`TRUNCATE TABLE "bookings", "booking_seats", "waitlist_entries", "seat_status", "show_category_pricing", "shows", "events", "venue_seats", "seat_categories", "venues" CASCADE;`);

  // Create users
  const password_hash = await bcrypt.hash('password123', 10);

  const admin = await prisma.user.upsert({
    where: { email: 'admin@seatzy.com' },
    update: { is_verified: true },
    create: { name: 'Admin User', email: 'admin@seatzy.com', password_hash, role: 'admin', is_verified: true }
  });

  const organiser = await prisma.user.upsert({
    where: { email: 'organiser@seatzy.com' },
    update: { is_verified: true },
    create: { name: 'Organiser User', email: 'organiser@seatzy.com', password_hash, role: 'organiser', is_verified: true }
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

  // --- VENUE 1: Seatzy Grand Cinema (Select CITYWALK, Saket, Delhi NCR) ---
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

  // --- VENUE 2: Jio World Arena (Bandra Kurla Complex, Mumbai) ---
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

  // --- VENUE 3: The Habitat Comedy Club (Koramangala, Bengaluru) ---
  const comedyVenue = await prisma.venue.create({
    data: { name: 'The Habitat Comedy Lounge', address: 'Koramangala 5th Block', city: 'Bengaluru', created_by: admin.id }
  });

  const comedySeats = [];
  const comedyRows = ['A', 'B', 'C', 'D', 'E', 'F'];
  for (let r = 0; r < comedyRows.length; r++) {
    for (let i = 1; i <= 12; i++) {
      comedySeats.push({ venue_id: comedyVenue.id, row_label: comedyRows[r], seat_number: i, category_id: generalComedyCat.id });
    }
  }
  await prisma.venueSeat.createMany({ data: comedySeats });

  // --- VENUE 4: Noida International Cricket Stadium (Noida) ---
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

  // --- VENUE 5: Balewadi Sports Complex (Pune) ---
  const footballVenue = await prisma.venue.create({
    data: { name: 'Balewadi Sports Complex', address: 'Shree Shiv Chhatrapati Sports Complex', city: 'Pune', created_by: admin.id }
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

  // --- REAL-LIFE REALISTIC EVENTS LISTING ---
  const eventData = [
    // CONCERTS
    {
      title: 'Coldplay: Music Of The Spheres World Tour',
      type: 'concert',
      description: 'The iconic global rock band returns for a breathtaking live experience featuring light-up wristbands, pyrotechnics, and legendary anthems.',
      poster_url: '/event_pics/electric_concert.png'
    },
    {
      title: 'A.R. Rahman: Symphony of Hope Live',
      type: 'concert',
      description: 'Oscar & Grammy winning maestro A.R. Rahman performs live with a full 60-piece orchestra playing timeless musical compositions.',
      poster_url: '/event_pics/golden_concert.png'
    },
    {
      title: 'Sunburn Arena EDM Night',
      type: 'concert',
      description: 'Asia’s premier EDM festival featuring world-class DJs, massive laser displays, and 360-degree bass-heavy stadium acoustics.',
      poster_url: '/event_pics/bass_drop_concert.png'
    },
    {
      title: 'Underground Indie Rock Revolution',
      type: 'concert',
      description: 'An intimate indie rock night featuring raw electric guitars and top upcoming alternative rock talents.',
      poster_url: '/event_pics/underground_concert.png'
    },
    {
      title: 'Midnight Jazz & Saxophone Lounge',
      type: 'concert',
      description: 'Smooth and sophisticated jazz saxophone solos under a clear moonlit open-air terrace.',
      poster_url: '/event_pics/jazz_concert.png'
    },

    // MOVIES
    {
      title: 'Avatar: The Seed Bearer (IMAX 3D)',
      type: 'movie',
      description: 'James Cameron returns to Pandora in a mesmerizing IMAX 3D adventure exploring uncharted ocean depths and volcanic biomes.',
      poster_url: '/event_pics/neon_movie.png'
    },
    {
      title: 'Neon Chronicles 2099',
      type: 'movie',
      description: 'A cyberpunk thriller following a rogue android detective racing against time across a neon-lit dystopian metropolis.',
      poster_url: '/event_pics/lost_voyage_movie.png'
    },
    {
      title: 'Oppenheimer: 70mm Special Re-Release',
      type: 'movie',
      description: 'Christopher Nolan’s epic historical masterpiece returning to the big screen in full original 70mm film print.',
      poster_url: '/event_pics/midnight_movie.png'
    },
    {
      title: 'Echoes of Eternity',
      type: 'movie',
      description: 'A fantasy film detailing the rise of legendary dragons and ancient spellcasters fighting for the golden crown.',
      poster_url: '/event_pics/echoes_movie.png'
    },
    {
      title: 'Velocity Shift: Formula Night Race',
      type: 'movie',
      description: 'High-octane racing thriller taking audiences inside the cockpit of 200mph night street circuits.',
      poster_url: '/event_pics/velocity_movie.png'
    },

    // COMEDY
    {
      title: 'Zakir Khan: Live & Tathastu Standup',
      type: 'comedy',
      description: 'India’s favorite Sakht Launda brings his hilarious observational comedy, relatable storytelling, and heartfelt punchlines.',
      poster_url: '/event_pics/laugh_comedy.png'
    },
    {
      title: 'Anubhav Singh Bassi: Bas Kar Bassi',
      type: 'comedy',
      description: 'Razor-sharp college & hostel nostalgia comedy from one of the sharpest storytellers in the comedy circuit.',
      poster_url: '/event_pics/roast_comedy.png'
    },
    {
      title: 'Improv Comedy Battle Royale',
      type: 'comedy',
      description: 'Spontaneous, unscripted, and wildly hilarious crowd-interactive improvisational comedy show.',
      poster_url: '/event_pics/chuckles_comedy.png'
    },
    {
      title: 'The Great Indian Roast Special',
      type: 'comedy',
      description: 'Top comedians face off with quick-witted roasts, dark humor, and brutal punchlines.',
      poster_url: '/event_pics/standup_comedy.png'
    },
    {
      title: 'Midnight Giggles & Unfiltered Satire',
      type: 'comedy',
      description: 'Late night adult standup comedy special packed with political satire, dark jokes, and raw crowd work.',
      poster_url: '/event_pics/midnight_comedy.png'
    },

    // SPORTS
    {
      title: 'India vs Australia T20 International Series',
      type: 'sports',
      subType: 'cricket',
      description: 'The ultimate cricket showdown! High-voltage T20 action packed with towering sixes and packed stadium roaring fans.',
      poster_url: '/event_pics/t20_sports.png'
    },
    {
      title: 'ISL Cup Final: Mumbai City vs Mohun Bagan',
      type: 'sports',
      subType: 'football',
      description: 'The pinnacle of Indian football! Two rival heavyweights battle for 90 minutes under stadium floodlights.',
      poster_url: '/event_pics/champions_sports.png'
    },
    {
      title: 'World Cricket Super Clash 2026',
      type: 'sports',
      subType: 'cricket',
      description: 'International cricket heavyweights collide live on the central turf pitch in an electric atmosphere.',
      poster_url: '/event_pics/world_sports.png'
    },
    {
      title: 'Apex Championship Fighting League (MMA)',
      type: 'sports',
      subType: 'boxing',
      description: 'Fierce mixed martial arts title bout featuring top championship fighters inside the Octagon ring.',
      poster_url: '/event_pics/apex_sports.png'
    },
    {
      title: 'National Gridiron Super Bowl 2026',
      type: 'sports',
      subType: 'football',
      description: 'The annual gridiron football championship with halftime show performances and thrilling touchdowns.',
      poster_url: '/event_pics/gridiron_sports.png'
    }
  ];

  // Starting anchor date: August 23, 2026
  const baseDate = new Date(2026, 7, 23); // Aug 23, 2026

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

    // Generate 3 realistic shows (Tonight Aug 23, Tomorrow Aug 24, and Upcoming Aug 28/29)
    const showOffsets = [0, 1, 5 + (i % 4)]; // 0 = Aug 23 (Today), 1 = Aug 24, 5+ = Aug 28-31
    const times = ['18:30', '19:45', '20:30'];

    for (let s = 0; s < 3; s++) {
      const showDate = new Date(baseDate);
      showDate.setDate(baseDate.getDate() + showOffsets[s]);
      const randomTime = times[s];

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
          { show_id: show.id, category_id: vipPitCat.id, price: 3500.00 },
          { show_id: show.id, category_id: goldenCircleCat.id, price: 2200.00 },
          { show_id: show.id, category_id: lowerTierCat.id, price: 1400.00 },
          { show_id: show.id, category_id: upperDeckCat.id, price: 800.00 }
        );
      } else if (ev.type === 'comedy') {
        pricingData.push(
          { show_id: show.id, category_id: generalComedyCat.id, price: 499.00 }
        );
      } else if (ev.type === 'sports') {
        pricingData.push(
          { show_id: show.id, category_id: vipPavilionCat.id, price: 2500.00 },
          { show_id: show.id, category_id: lowerTierCat.id, price: 1200.00 },
          { show_id: show.id, category_id: upperDeckCat.id, price: 500.00 }
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

  console.log('Database successfully re-seeded with realistic August 23, 2026+ events, iconic venues, and full INR pricing!');
}

main()
  .catch(e => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
