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
  const cinemaRows = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H']; // 8 rows
  for (let r = 0; r < cinemaRows.length; r++) {
    const rowLabel = cinemaRows[r];
    let categoryId = standardCat.id;
    if (r >= 2 && r <= 5) categoryId = premiumCat.id;
    if (r >= 6) categoryId = reclinerCat.id;

    for (let i = 1; i <= 14; i++) { // 14 seats per row
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

  // --- VENUE 3: Seatzy Underground Comedy Club (For Comedy — FLAT PRICING FOR ALL SEATS) ---
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

  // --- 20 EVENTS ---
  const eventData = [
    // MOVIES
    { title: 'Neon Chronicles', type: 'movie', description: 'A cyberpunk neo-noir film set in a dystopian future where human memories are traded as currency.', poster_url: '/images/movie_1_1787259781700.png' },
    { title: 'The Last Voyage', type: 'movie', description: 'A sci-fi epic following a lone starship searching for a new habitable world.', poster_url: '/images/movie_2_1787259806699.png' },
    { title: 'Midnight Paradox', type: 'movie', description: 'A gripping mystery thriller that twists the fabric of time.', poster_url: '/images/movie_3_1787333184688.png' },
    { title: 'Echoes of Eternity', type: 'movie', description: 'A sweeping fantasy epic detailing the fall of an ancient magical empire.', poster_url: '/images/movie_4_1787259842743.png' },
    { title: 'Velocity Shift', type: 'movie', description: 'High octane racing action across neon-lit city streets.', poster_url: '/images/movie_5_1787259860945.png' },

    // CONCERTS
    { title: 'Electric Symphony', type: 'concert', description: 'A massive EDM festival featuring cutting-edge laser shows and massive drops.', poster_url: '/images/concert_1_1787259877711.png' },
    { title: 'Echoes of the Underground', type: 'concert', description: 'An intimate indie rock gig showcasing the best upcoming bands.', poster_url: '/images/concert_2_1787259889930.png' },
    { title: 'Jazz Under the Stars', type: 'concert', description: 'Smooth and elegant jazz performance under an open sky.', poster_url: '/images/concert_3_1787259917113.png' },
    { title: 'Bass Drop Riot', type: 'concert', description: 'Heavy dubstep and bass music that will shake the floor.', poster_url: '/images/concert_4_178733219101.png' },
    { title: 'The Golden Era Tour', type: 'concert', description: 'A tribute to the greatest classic rock anthems of the 70s and 80s.', poster_url: '/images/concert_5_1787259941929.png' },

    // COMEDY (NO STAGE, ALL SEATS SAME PRICE)
    { title: 'Laugh Riot: Unfiltered', type: 'comedy', description: 'No holds barred standup comedy from the best rising stars.', poster_url: '/images/comedy_1_1787259957907.png' },
    { title: 'The Daily Roast', type: 'comedy', description: 'A brutal and hilarious roast battle between top comedians.', poster_url: '/images/comedy_2_1787259970477.png' },
    { title: 'Chuckles & Cheers', type: 'comedy', description: 'A family-friendly improv show filled with unexpected turns.', poster_url: '/images/comedy_3_1787259983214.png' },
    { title: 'Stand-Up Showdown', type: 'comedy', description: 'Comedians face off to win the ultimate title in a boxing-ring style stage.', poster_url: '/images/comedy_4_1787332545212.png' },
    { title: 'Midnight Giggles', type: 'comedy', description: 'A late-night special featuring dark humor and satire.', poster_url: '/images/comedy_5_1787332562947.png' },

    // SPORTS (CRICKET & FOOTBALL STADIUMS)
    { title: 'T20 Premier Cricket League Derby', type: 'sports', subType: 'cricket', description: 'High stakes T20 Cricket derby with boundary sixes and electric crowd.', poster_url: '/images/sports_2_1787333026606.png' },
    { title: 'Champions Trophy Football Final', type: 'sports', subType: 'football', description: 'The ultimate soccer showdown under stadium floodlights.', poster_url: '/images/sports_5_1787333158050.png' },
    { title: 'World Cricket Super Clash', type: 'sports', subType: 'cricket', description: 'International cricket heavyweights clash on the central pitch.', poster_url: '/images/sports_1_1787332917988.png' },
    { title: 'Gridiron Football Championship', type: 'sports', subType: 'football', description: 'Two massive rival football teams face off in the grand stadium.', poster_url: '/images/sports_3_1787333040876.png' },
    { title: 'Apex Fight Championship', type: 'sports', subType: 'boxing', description: 'The premier championship fight event of the year.', poster_url: '/images/sports_4_1787333056253.png' }
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
        // COMEDY: SINGLE FLAT PRICE FOR ALL SEATS ($35.00)
        pricingData.push(
          { show_id: show.id, category_id: generalComedyCat.id, price: 35.00 }
        );
      } else if (ev.type === 'sports') {
        // SPORTS: MULTI-TIER STADIUM PRICING
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

  console.log('Database successfully re-seeded with specialized Movie, Concert, Comedy, and Sports (Cricket/Football) venues!');
}

main()
  .catch(e => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
