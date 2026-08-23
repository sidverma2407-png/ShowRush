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
  console.log('Clearing old data and seeding database with real-world Indian events, cinema chains, metadata, trailers, addons & reviews...');

  // Clean wipe tables for fresh layout seeding
  await prisma.$executeRawUnsafe(`TRUNCATE TABLE "coupons", "booking_addons", "addon_items", "reviews", "bookings", "booking_seats", "waitlist_entries", "seat_status", "show_category_pricing", "shows", "events", "venue_seats", "seat_categories", "venues" CASCADE;`);

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

  const reviewer1 = await prisma.user.upsert({
    where: { email: 'aarav.sharma@example.com' },
    update: { is_verified: true },
    create: { name: 'Aarav Sharma', email: 'aarav.sharma@example.com', password_hash, role: 'customer', is_verified: true }
  });

  const reviewer2 = await prisma.user.upsert({
    where: { email: 'diya.patel@example.com' },
    update: { is_verified: true },
    create: { name: 'Diya Patel', email: 'diya.patel@example.com', password_hash, role: 'customer', is_verified: true }
  });

  // --- SEED PROMO / COUPON CODES ---
  console.log('Seeding Promo / Coupon Codes...');
  await prisma.coupon.createMany({
    data: [
      { code: 'SEATZY10', discount_type: 'percentage', discount_value: 10.00, max_uses: 100, min_amount: 300.00, is_active: true, created_by: admin.id },
      { code: 'FLAT100', discount_type: 'flat', discount_value: 100.00, max_uses: 50, min_amount: 500.00, is_active: true, created_by: admin.id },
      { code: 'WELCOME50', discount_type: 'percentage', discount_value: 15.00, max_uses: 200, min_amount: 200.00, is_active: true, created_by: admin.id },
      { code: 'FEAST50', discount_type: 'flat', discount_value: 50.00, max_uses: 30, min_amount: 250.00, is_active: true, created_by: admin.id }
    ]
  });

  // Helper to ensure seat category exists
  async function getCategory(name: string) {
    let cat = await prisma.seatCategory.findFirst({ where: { name } });
    if (!cat) {
      cat = await prisma.seatCategory.create({ data: { name } });
    }
    return cat;
  }

  // Seat Categories
  const vipPitCat = await getCategory('VIP Lounge');
  const goldenCircleCat = await getCategory('Golden Circle');
  const lowerTierCat = await getCategory('Lower Stand');
  const upperDeckCat = await getCategory('Upper Pavilion');
  const reclinerCat = await getCategory('IMAX Recliner');
  const generalCat = await getCategory('General Admission');

  // --- SEED FOOD & DRINKS ADDONS ---
  console.log('Seeding Food & Drinks Addons...');
  await prisma.addonItem.createMany({
    data: [
      { name: 'Caramel Popcorn (Large)', category: 'food', price: 350.00, image_url: 'https://images.unsplash.com/photo-1578849278619-e73505e9610f?w=400', available: true },
      { name: 'Salted Butter Popcorn (Medium)', category: 'food', price: 280.00, image_url: 'https://images.unsplash.com/photo-1585647347483-22b66260dfff?w=400', available: true },
      { name: 'Cheesy Nachos with Salsa', category: 'food', price: 320.00, image_url: 'https://images.unsplash.com/photo-1513456852971-30c0b8199d4d?w=400', available: true },
      { name: 'Gourmet Chicken Burger', category: 'food', price: 390.00, image_url: 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=400', available: true },
      { name: 'Cold Pepsi (500ml)', category: 'drink', price: 180.00, image_url: '/event_pics/pepsi_can.png', available: true },
      { name: 'Coca-Cola Zero Sugar (500ml)', category: 'drink', price: 180.00, image_url: 'https://images.unsplash.com/photo-1554866585-cd94860890b7?w=400', available: true },
      { name: 'Iced Hazelnut Cold Coffee', category: 'drink', price: 240.00, image_url: 'https://images.unsplash.com/photo-1517701604599-bb29b565090c?w=400', available: true },
      { name: 'Blockbuster Combo: Large Popcorn + 2 Pepsi', category: 'combo', price: 590.00, image_url: 'https://images.unsplash.com/photo-1585647347483-22b66260dfff?w=400', available: true }
    ]
  });

  // --- REAL VENUES WITH CINEMA CHAINS ---
  const pvrDelhi = await prisma.venue.create({
    data: { name: "PVR Director's Cut, Ambience Mall", address: 'Vasant Kunj', city: 'Delhi NCR', chain: 'PVR', created_by: admin.id }
  });

  const inoxDelhi = await prisma.venue.create({
    data: { name: 'INOX Megaplex, Nehru Place', address: 'Nehru Place', city: 'Delhi NCR', chain: 'INOX', created_by: admin.id }
  });

  const jioMumbai = await prisma.venue.create({
    data: { name: 'Jio World Garden, BKC', address: 'Bandra Kurla Complex', city: 'Mumbai', chain: 'Independent', created_by: admin.id }
  });

  const cinepolisMumbai = await prisma.venue.create({
    data: { name: 'Cinepolis VIP, Fun Republic', address: 'Andheri West', city: 'Mumbai', chain: 'Cinepolis', created_by: admin.id }
  });

  const wankhedeMumbai = await prisma.venue.create({
    data: { name: 'Wankhede Cricket Stadium', address: 'Churchgate', city: 'Mumbai', chain: 'Independent', created_by: admin.id }
  });

  const noidaStadium = await prisma.venue.create({
    data: { name: 'Noida International Cricket Stadium', address: 'Sector 21A', city: 'Noida', chain: 'Independent', created_by: admin.id }
  });

  const habitatBlr = await prisma.venue.create({
    data: { name: 'The Habitat Comedy Lounge', address: 'Koramangala 5th Block', city: 'Bengaluru', chain: 'The Habitat', created_by: admin.id }
  });

  const pvrBlr = await prisma.venue.create({
    data: { name: 'PVR Forum Mall, Koramangala', address: 'Koramangala', city: 'Bengaluru', chain: 'PVR', created_by: admin.id }
  });

  const chinnaswamyBlr = await prisma.venue.create({
    data: { name: 'M. Chinnaswamy Stadium', address: 'MG Road', city: 'Bengaluru', chain: 'Independent', created_by: admin.id }
  });

  const balewadiPune = await prisma.venue.create({
    data: { name: 'Shree Shiv Chhatrapati Sports Complex', address: 'Balewadi', city: 'Pune', chain: 'Independent', created_by: admin.id }
  });

  const gachibowliHyd = await prisma.venue.create({
    data: { name: 'Gachibowli Indoor Arena', address: 'Gachibowli', city: 'Hyderabad', chain: 'Independent', created_by: admin.id }
  });

  // Create seat layouts for venues
  const createLayout = async (venueId: string, sections: { rows: string[], catId: string }[], cols: number) => {
    const seats = [];
    for (const section of sections) {
      for (const row of section.rows) {
        for (let c = 1; c <= cols; c++) {
          seats.push({ venue_id: venueId, row_label: row, seat_number: c, category_id: section.catId });
        }
      }
    }
    await prisma.venueSeat.createMany({ data: seats });
  };

  await createLayout(pvrDelhi.id, [{ rows: ['A', 'B', 'C'], catId: generalCat.id }, { rows: ['D', 'E'], catId: reclinerCat.id }], 12);
  await createLayout(inoxDelhi.id, [{ rows: ['A', 'B', 'C'], catId: generalCat.id }, { rows: ['D', 'E'], catId: reclinerCat.id }], 12);
  await createLayout(jioMumbai.id, [{ rows: ['A', 'B'], catId: vipPitCat.id }, { rows: ['C', 'D'], catId: goldenCircleCat.id }, { rows: ['E', 'F'], catId: lowerTierCat.id }, { rows: ['G', 'H'], catId: upperDeckCat.id }], 16);
  await createLayout(cinepolisMumbai.id, [{ rows: ['A', 'B', 'C'], catId: generalCat.id }, { rows: ['D', 'E'], catId: reclinerCat.id }], 12);
  await createLayout(wankhedeMumbai.id, [{ rows: ['A', 'B'], catId: vipPitCat.id }, { rows: ['C', 'D', 'E'], catId: lowerTierCat.id }, { rows: ['F', 'G'], catId: upperDeckCat.id }], 16);
  await createLayout(noidaStadium.id, [{ rows: ['A', 'B'], catId: vipPitCat.id }, { rows: ['C', 'D', 'E'], catId: lowerTierCat.id }, { rows: ['F', 'G'], catId: upperDeckCat.id }], 16);
  await createLayout(habitatBlr.id, [{ rows: ['A', 'B'], catId: goldenCircleCat.id }, { rows: ['C', 'D'], catId: generalCat.id }], 10);
  await createLayout(pvrBlr.id, [{ rows: ['A', 'B', 'C'], catId: generalCat.id }, { rows: ['D', 'E'], catId: reclinerCat.id }], 12);
  await createLayout(chinnaswamyBlr.id, [{ rows: ['A', 'B'], catId: vipPitCat.id }, { rows: ['C', 'D', 'E'], catId: lowerTierCat.id }, { rows: ['F', 'G', 'H'], catId: upperDeckCat.id }], 16);
  await createLayout(balewadiPune.id, [{ rows: ['A', 'B'], catId: vipPitCat.id }, { rows: ['C', 'D'], catId: lowerTierCat.id }, { rows: ['E', 'F'], catId: upperDeckCat.id }], 14);
  await createLayout(gachibowliHyd.id, [{ rows: ['A', 'B'], catId: vipPitCat.id }, { rows: ['C', 'D', 'E'], catId: goldenCircleCat.id }, { rows: ['F', 'G'], catId: lowerTierCat.id }, { rows: ['H', 'I'], catId: upperDeckCat.id }], 14);

  // --- 20 EXACT USER SPECIFIED EVENTS (DATED AFTER AUG 24, 2026) WITH RICH MULTI-DATE SCHEDULE ---
  const eventList = [
    // --- 1. CONCERTS ---
    {
      title: 'A.R. Rahman – The Wonderment Tour Live',
      type: 'concert',
      description: 'The Oscar and Grammy-winning musical maestro is hosting a rare, massive live arena performance. The concert will feature a full live orchestra, state-of-the-art immersive visual production, and a definitive journey through his legendary catalog.',
      poster_url: '/event_pics/arrahman.png',
      language: 'Hindi',
      format: 'Live Orchestra',
      genre: 'Classical, Sufi, Pop',
      certification: 'U',
      cast: 'A.R. Rahman, Jonita Gandhi, Haricharan, Mohit Chauhan',
      trailer_url: 'https://www.youtube.com/watch?v=1T2bXySg08U',
      shows: [
        { venue: chinnaswamyBlr, dayOffset: 1, time: '19:00', format: 'Live Arena', language: 'Hindi/Tamil' },
        { venue: chinnaswamyBlr, dayOffset: 2, time: '19:00', format: 'Live Arena', language: 'Hindi/Tamil' },
        { venue: chinnaswamyBlr, dayOffset: 3, time: '18:30', format: 'Live Arena', language: 'Hindi/Tamil' },
        { venue: chinnaswamyBlr, dayOffset: 4, time: '19:00', format: 'Live Arena', language: 'Hindi/Tamil' },
        { venue: jioMumbai, dayOffset: 5, time: '18:30', format: 'Live Arena', language: 'Hindi/Tamil' },
        { venue: jioMumbai, dayOffset: 6, time: '19:30', format: 'Live Arena', language: 'Hindi/Tamil' },
        { venue: noidaStadium, dayOffset: 7, time: '19:00', format: 'Live Arena', language: 'Hindi/Tamil' }
      ]
    },
    {
      title: 'Fred again.. – Debut India Tour',
      type: 'concert',
      description: 'The international electronic music sensation is bringing his highly anticipated live show to India for the first time. The open-air festival tour spans major metropolitan cities, performing hits from his Actual Life series to his latest USB releases.',
      poster_url: '/event_pics/fredagain.png',
      language: 'English',
      format: 'Live EDM',
      genre: 'Electronic, House, Ambient',
      certification: 'U/A',
      cast: 'Fred again..',
      trailer_url: 'https://www.youtube.com/watch?v=c0-hvjV2A5Y',
      shows: [
        { venue: noidaStadium, dayOffset: 1, time: '18:00', format: 'Open Air', language: 'English' },
        { venue: noidaStadium, dayOffset: 2, time: '21:00', format: 'Open Air', language: 'English' },
        { venue: noidaStadium, dayOffset: 3, time: '19:00', format: 'Open Air', language: 'English' },
        { venue: chinnaswamyBlr, dayOffset: 4, time: '18:00', format: 'Open Air', language: 'English' },
        { venue: chinnaswamyBlr, dayOffset: 5, time: '21:30', format: 'Open Air', language: 'English' },
        { venue: jioMumbai, dayOffset: 6, time: '19:00', format: 'Open Air', language: 'English' },
        { venue: jioMumbai, dayOffset: 7, time: '21:30', format: 'Open Air', language: 'English' }
      ]
    },
    {
      title: 'Sonu Nigam – Satrangi Re India Tour',
      type: 'concert',
      description: 'One of Bollywood’s most iconic playback singers is launching a massive multi-city stadium tour conceptualized by NR Talent & Event Management. The grand outdoor concept navigates the "seven colors" of romantic music and emotions.',
      poster_url: '/event_pics/sonunigam.png',
      language: 'Hindi',
      format: 'Live Concert',
      genre: 'Bollywood, Romantic',
      certification: 'U',
      cast: 'Sonu Nigam',
      trailer_url: 'https://www.youtube.com/watch?v=y1D11B5zW1w',
      shows: [
        { venue: gachibowliHyd, dayOffset: 1, time: '19:30', format: 'Stadium', language: 'Hindi' },
        { venue: gachibowliHyd, dayOffset: 2, time: '19:30', format: 'Stadium', language: 'Hindi' },
        { venue: gachibowliHyd, dayOffset: 3, time: '18:30', format: 'Stadium', language: 'Hindi' },
        { venue: wankhedeMumbai, dayOffset: 4, time: '19:00', format: 'Stadium', language: 'Hindi' },
        { venue: wankhedeMumbai, dayOffset: 5, time: '20:00', format: 'Stadium', language: 'Hindi' },
        { venue: noidaStadium, dayOffset: 6, time: '19:00', format: 'Stadium', language: 'Hindi' },
        { venue: noidaStadium, dayOffset: 7, time: '19:30', format: 'Stadium', language: 'Hindi' }
      ]
    },
    {
      title: 'Orchestral Qawwali Project – India Debut Tour',
      type: 'concert',
      description: 'Led by composer Rushil Ranjan and singer Abi Sampa, this globally acclaimed ensemble seamlessly blends Western classical orchestration, choral arrangements, and traditional Sufi Qawwali following sell-out shows at London\'s Royal Albert Hall.',
      poster_url: '/event_pics/qawwali.png',
      language: 'Hindi',
      format: 'Orchestral Sufi',
      genre: 'Sufi, Fusion, Classical',
      certification: 'U',
      cast: 'Rushil Ranjan, Abi Sampa',
      trailer_url: 'https://www.youtube.com/watch?v=kY7m87b3z2M',
      shows: [
        { venue: jioMumbai, dayOffset: 1, time: '18:00', format: 'Live Garden', language: 'Hindi/Urdu' },
        { venue: jioMumbai, dayOffset: 2, time: '19:00', format: 'Live Garden', language: 'Hindi/Urdu' },
        { venue: jioMumbai, dayOffset: 3, time: '19:30', format: 'Live Garden', language: 'Hindi/Urdu' },
        { venue: noidaStadium, dayOffset: 4, time: '18:30', format: 'Live Garden', language: 'Hindi/Urdu' },
        { venue: noidaStadium, dayOffset: 5, time: '19:00', format: 'Live Garden', language: 'Hindi/Urdu' },
        { venue: chinnaswamyBlr, dayOffset: 6, time: '19:00', format: 'Live Garden', language: 'Hindi/Urdu' }
      ]
    },
    {
      title: 'Film Expo India – 5-Day Mega Music Festival',
      type: 'concert',
      description: 'A massive five-day music, devotion, and pop-culture exhibition featuring heavyweights from across Indian music scenes, including Sufi melodies, massive Bollywood sets, and classical live performance nights.',
      poster_url: '/event_pics/filmindia.png',
      language: 'Hindi',
      format: 'Festival',
      genre: 'Devotional, Sufi, Pop',
      certification: 'U',
      cast: 'Anup Jalota, Malini Awasthi, Madhubanti Bagchi, Afsana Khan',
      trailer_url: 'https://www.youtube.com/watch?v=QcIy9NiNbmo',
      shows: [
        { venue: noidaStadium, dayOffset: 1, time: '18:00', format: 'Festival', language: 'Hindi' },
        { venue: noidaStadium, dayOffset: 2, time: '19:00', format: 'Festival', language: 'Hindi' },
        { venue: noidaStadium, dayOffset: 3, time: '18:30', format: 'Festival', language: 'Hindi' },
        { venue: noidaStadium, dayOffset: 4, time: '19:30', format: 'Festival', language: 'Hindi' },
        { venue: noidaStadium, dayOffset: 5, time: '20:00', format: 'Festival', language: 'Hindi' },
        { venue: jioMumbai, dayOffset: 6, time: '18:30', format: 'Festival', language: 'Hindi' },
        { venue: jioMumbai, dayOffset: 7, time: '19:30', format: 'Festival', language: 'Hindi' }
      ]
    },

    // --- 2. MOVIES ---
    {
      title: 'Spider-Man: Brand New Day',
      type: 'movie',
      description: 'Tom Holland swings back onto the big screen in this highly-anticipated Marvel blockbuster, serving as a major theatrical draw across Indian multiplexes.',
      poster_url: '/event_pics/spiderman_movie.png',
      language: 'English',
      format: 'IMAX 3D',
      genre: 'Action, Superhero, Sci-Fi',
      certification: 'U/A',
      cast: 'Tom Holland, Zendaya, Jacob Batalon, Benedict Cumberbatch',
      trailer_url: 'https://www.youtube.com/watch?v=8TZMtslA3UY',
      shows: [
        // Day 1
        { venue: pvrDelhi, dayOffset: 1, time: '11:00', format: 'IMAX 3D', language: 'English' },
        { venue: pvrDelhi, dayOffset: 1, time: '15:15', format: 'IMAX 3D', language: 'English' },
        { venue: pvrDelhi, dayOffset: 1, time: '18:30', format: '2D', language: 'Hindi' },
        { venue: pvrDelhi, dayOffset: 1, time: '21:45', format: 'IMAX 3D', language: 'English' },
        { venue: inoxDelhi, dayOffset: 1, time: '13:00', format: '4DX 3D', language: 'Hindi' },
        { venue: inoxDelhi, dayOffset: 1, time: '17:00', format: '4DX 3D', language: 'English' },
        { venue: cinepolisMumbai, dayOffset: 1, time: '14:00', format: 'IMAX 3D', language: 'English' },
        { venue: pvrBlr, dayOffset: 1, time: '19:00', format: 'IMAX 3D', language: 'English' },

        // Day 2
        { venue: pvrDelhi, dayOffset: 2, time: '10:30', format: 'IMAX 3D', language: 'English' },
        { venue: pvrDelhi, dayOffset: 2, time: '14:00', format: '2D', language: 'Hindi' },
        { venue: pvrDelhi, dayOffset: 2, time: '17:30', format: 'IMAX 3D', language: 'English' },
        { venue: pvrDelhi, dayOffset: 2, time: '21:00', format: 'IMAX 3D', language: 'English' },
        { venue: inoxDelhi, dayOffset: 2, time: '12:30', format: '4DX 3D', language: 'English' },
        { venue: inoxDelhi, dayOffset: 2, time: '16:45', format: '4DX 3D', language: 'Hindi' },
        { venue: cinepolisMumbai, dayOffset: 2, time: '18:00', format: 'IMAX 3D', language: 'English' },
        { venue: pvrBlr, dayOffset: 2, time: '20:30', format: 'IMAX 3D', language: 'English' },

        // Day 3
        { venue: pvrDelhi, dayOffset: 3, time: '11:15', format: 'IMAX 3D', language: 'English' },
        { venue: pvrDelhi, dayOffset: 3, time: '15:30', format: 'IMAX 3D', language: 'English' },
        { venue: pvrDelhi, dayOffset: 3, time: '19:00', format: '2D', language: 'Hindi' },
        { venue: pvrDelhi, dayOffset: 3, time: '22:15', format: 'IMAX 3D', language: 'English' },
        { venue: inoxDelhi, dayOffset: 3, time: '14:00', format: '4DX 3D', language: 'English' },
        { venue: cinepolisMumbai, dayOffset: 3, time: '15:30', format: 'IMAX 3D', language: 'English' },
        { venue: pvrBlr, dayOffset: 3, time: '17:45', format: 'IMAX 3D', language: 'English' },

        // Day 4
        { venue: pvrDelhi, dayOffset: 4, time: '12:00', format: 'IMAX 3D', language: 'English' },
        { venue: pvrDelhi, dayOffset: 4, time: '16:00', format: '2D', language: 'Hindi' },
        { venue: pvrDelhi, dayOffset: 4, time: '20:00', format: 'IMAX 3D', language: 'English' },
        { venue: inoxDelhi, dayOffset: 4, time: '18:30', format: '4DX 3D', language: 'English' },
        { venue: cinepolisMumbai, dayOffset: 4, time: '19:15', format: 'IMAX 3D', language: 'English' },
        { venue: pvrBlr, dayOffset: 4, time: '21:00', format: 'IMAX 3D', language: 'English' },

        // Day 5
        { venue: pvrDelhi, dayOffset: 5, time: '11:00', format: 'IMAX 3D', language: 'English' },
        { venue: pvrDelhi, dayOffset: 5, time: '15:00', format: 'IMAX 3D', language: 'English' },
        { venue: pvrDelhi, dayOffset: 5, time: '19:30', format: '2D', language: 'Hindi' },
        { venue: inoxDelhi, dayOffset: 5, time: '16:30', format: '4DX 3D', language: 'Hindi' },
        { venue: cinepolisMumbai, dayOffset: 5, time: '17:00', format: 'IMAX 3D', language: 'English' },
        { venue: pvrBlr, dayOffset: 5, time: '19:30', format: 'IMAX 3D', language: 'English' },

        // Day 6
        { venue: pvrDelhi, dayOffset: 6, time: '13:00', format: 'IMAX 3D', language: 'English' },
        { venue: pvrDelhi, dayOffset: 6, time: '17:30', format: 'IMAX 3D', language: 'English' },
        { venue: pvrDelhi, dayOffset: 6, time: '21:30', format: '2D', language: 'Hindi' },
        { venue: inoxDelhi, dayOffset: 6, time: '19:00', format: '4DX 3D', language: 'English' },
        { venue: cinepolisMumbai, dayOffset: 6, time: '20:00', format: 'IMAX 3D', language: 'English' },
        { venue: pvrBlr, dayOffset: 6, time: '18:00', format: 'IMAX 3D', language: 'English' },

        // Day 7
        { venue: pvrDelhi, dayOffset: 7, time: '12:00', format: 'IMAX 3D', language: 'English' },
        { venue: pvrDelhi, dayOffset: 7, time: '16:30', format: 'IMAX 3D', language: 'English' },
        { venue: pvrDelhi, dayOffset: 7, time: '20:30', format: '2D', language: 'Hindi' },
        { venue: inoxDelhi, dayOffset: 7, time: '15:00', format: '4DX 3D', language: 'Hindi' },
        { venue: cinepolisMumbai, dayOffset: 7, time: '19:00', format: 'IMAX 3D', language: 'English' },
        { venue: pvrBlr, dayOffset: 7, time: '21:30', format: 'IMAX 3D', language: 'English' }
      ]
    },
    {
      title: 'Odyssey',
      type: 'movie',
      description: 'A grand historical epic starring Ralph Fiennes and Juliette Binoche, retelling Homer\'s classic tale of Odysseus returning home from the Trojan War.',
      poster_url: '/event_pics/odyssey_movie.png',
      language: 'English',
      format: '2D',
      genre: 'Drama, Action, History',
      certification: 'A',
      cast: 'Ralph Fiennes, Juliette Binoche, Charlie Plummer',
      trailer_url: 'https://www.youtube.com/watch?v=f_bKjZeJBBI',
      shows: [
        // Day 1
        { venue: pvrDelhi, dayOffset: 1, time: '13:00', format: '2D', language: 'English' },
        { venue: pvrDelhi, dayOffset: 1, time: '17:00', format: '2D', language: 'English' },
        { venue: pvrDelhi, dayOffset: 1, time: '21:00', format: '2D', language: 'English' },
        { venue: cinepolisMumbai, dayOffset: 1, time: '18:30', format: '2D', language: 'English' },
        { venue: inoxDelhi, dayOffset: 1, time: '15:30', format: '2D', language: 'English' },
        { venue: pvrBlr, dayOffset: 1, time: '19:30', format: '2D', language: 'English' },

        // Day 2
        { venue: pvrDelhi, dayOffset: 2, time: '12:30', format: '2D', language: 'English' },
        { venue: pvrDelhi, dayOffset: 2, time: '16:30', format: '2D', language: 'English' },
        { venue: pvrDelhi, dayOffset: 2, time: '20:30', format: '2D', language: 'English' },
        { venue: cinepolisMumbai, dayOffset: 2, time: '17:00', format: '2D', language: 'English' },
        { venue: inoxDelhi, dayOffset: 2, time: '19:00', format: '2D', language: 'English' },

        // Day 3
        { venue: pvrDelhi, dayOffset: 3, time: '13:30', format: '2D', language: 'English' },
        { venue: pvrDelhi, dayOffset: 3, time: '17:30', format: '2D', language: 'English' },
        { venue: pvrDelhi, dayOffset: 3, time: '21:30', format: '2D', language: 'English' },
        { venue: cinepolisMumbai, dayOffset: 3, time: '19:30', format: '2D', language: 'English' },
        { venue: pvrBlr, dayOffset: 3, time: '18:00', format: '2D', language: 'English' },

        // Day 4
        { venue: pvrDelhi, dayOffset: 4, time: '14:00', format: '2D', language: 'English' },
        { venue: pvrDelhi, dayOffset: 4, time: '18:00', format: '2D', language: 'English' },
        { venue: pvrDelhi, dayOffset: 4, time: '21:45', format: '2D', language: 'English' },
        { venue: cinepolisMumbai, dayOffset: 4, time: '20:15', format: '2D', language: 'English' },

        // Day 5
        { venue: pvrDelhi, dayOffset: 5, time: '12:00', format: '2D', language: 'English' },
        { venue: pvrDelhi, dayOffset: 5, time: '16:00', format: '2D', language: 'English' },
        { venue: pvrDelhi, dayOffset: 5, time: '20:00', format: '2D', language: 'English' },
        { venue: inoxDelhi, dayOffset: 5, time: '17:30', format: '2D', language: 'English' },
        { venue: pvrBlr, dayOffset: 5, time: '20:30', format: '2D', language: 'English' },

        // Day 6
        { venue: pvrDelhi, dayOffset: 6, time: '13:00', format: '2D', language: 'English' },
        { venue: pvrDelhi, dayOffset: 6, time: '17:00', format: '2D', language: 'English' },
        { venue: pvrDelhi, dayOffset: 6, time: '21:00', format: '2D', language: 'English' },
        { venue: cinepolisMumbai, dayOffset: 6, time: '18:45', format: '2D', language: 'English' },

        // Day 7
        { venue: pvrDelhi, dayOffset: 7, time: '14:30', format: '2D', language: 'English' },
        { venue: pvrDelhi, dayOffset: 7, time: '18:30', format: '2D', language: 'English' },
        { venue: pvrDelhi, dayOffset: 7, time: '22:00', format: '2D', language: 'English' },
        { venue: inoxDelhi, dayOffset: 7, time: '19:30', format: '2D', language: 'English' }
      ]
    },
    {
      title: 'The End of Oak Street',
      type: 'movie',
      description: 'A multi-lingual sci-fi adventure starring Anne Hathaway, where an entire suburban neighborhood is mysteriously transported back to the prehistoric age of dinosaurs.',
      poster_url: '/event_pics/oakstreet_movie.png',
      language: 'English',
      format: '3D',
      genre: 'Sci-Fi, Thriller, Mystery',
      certification: 'U/A',
      cast: 'Anne Hathaway, Oscar Isaac, Mahershala Ali',
      trailer_url: 'https://www.youtube.com/watch?v=3oB9AxspVow',
      shows: [
        // Day 1
        { venue: pvrDelhi, dayOffset: 1, time: '14:00', format: '3D', language: 'English' },
        { venue: pvrDelhi, dayOffset: 1, time: '18:00', format: '3D', language: 'Hindi' },
        { venue: pvrDelhi, dayOffset: 1, time: '21:30', format: '3D', language: 'English' },
        { venue: inoxDelhi, dayOffset: 1, time: '16:00', format: '2D', language: 'Hindi' },
        { venue: cinepolisMumbai, dayOffset: 1, time: '17:30', format: '3D', language: 'English' },
        { venue: pvrBlr, dayOffset: 1, time: '20:00', format: '3D', language: 'English' },

        // Day 2
        { venue: pvrDelhi, dayOffset: 2, time: '11:30', format: '3D', language: 'English' },
        { venue: pvrDelhi, dayOffset: 2, time: '15:00', format: '3D', language: 'Hindi' },
        { venue: pvrDelhi, dayOffset: 2, time: '19:00', format: '3D', language: 'English' },
        { venue: inoxDelhi, dayOffset: 2, time: '18:15', format: '3D', language: 'English' },
        { venue: cinepolisMumbai, dayOffset: 2, time: '21:00', format: '3D', language: 'English' },

        // Day 3
        { venue: pvrDelhi, dayOffset: 3, time: '13:00', format: '3D', language: 'English' },
        { venue: pvrDelhi, dayOffset: 3, time: '17:15', format: '3D', language: 'Hindi' },
        { venue: pvrDelhi, dayOffset: 3, time: '21:00', format: '3D', language: 'English' },
        { venue: inoxDelhi, dayOffset: 3, time: '15:45', format: '2D', language: 'Hindi' },
        { venue: pvrBlr, dayOffset: 3, time: '18:30', format: '3D', language: 'English' },

        // Day 4
        { venue: pvrDelhi, dayOffset: 4, time: '12:30', format: '3D', language: 'English' },
        { venue: pvrDelhi, dayOffset: 4, time: '16:45', format: '3D', language: 'Hindi' },
        { venue: pvrDelhi, dayOffset: 4, time: '20:30', format: '3D', language: 'English' },
        { venue: cinepolisMumbai, dayOffset: 4, time: '19:00', format: '3D', language: 'English' },

        // Day 5
        { venue: pvrDelhi, dayOffset: 5, time: '14:30', format: '3D', language: 'English' },
        { venue: pvrDelhi, dayOffset: 5, time: '18:30', format: '3D', language: 'Hindi' },
        { venue: pvrDelhi, dayOffset: 5, time: '22:00', format: '3D', language: 'English' },
        { venue: inoxDelhi, dayOffset: 5, time: '19:15', format: '3D', language: 'English' },
        { venue: pvrBlr, dayOffset: 5, time: '21:15', format: '3D', language: 'English' },

        // Day 6
        { venue: pvrDelhi, dayOffset: 6, time: '11:00', format: '3D', language: 'English' },
        { venue: pvrDelhi, dayOffset: 6, time: '15:30', format: '3D', language: 'Hindi' },
        { venue: pvrDelhi, dayOffset: 6, time: '19:45', format: '3D', language: 'English' },
        { venue: cinepolisMumbai, dayOffset: 6, time: '18:00', format: '3D', language: 'English' },

        // Day 7
        { venue: pvrDelhi, dayOffset: 7, time: '13:30', format: '3D', language: 'English' },
        { venue: pvrDelhi, dayOffset: 7, time: '17:45', format: '3D', language: 'Hindi' },
        { venue: pvrDelhi, dayOffset: 7, time: '21:15', format: '3D', language: 'English' },
        { venue: inoxDelhi, dayOffset: 7, time: '20:00', format: '3D', language: 'English' }
      ]
    },
    {
      title: 'Awarapan 2',
      type: 'movie',
      description: 'Emraan Hashmi returns as Shivam Pandit after nearly two decades in this intense, action-packed gangster romance sequel.',
      poster_url: '/event_pics/awara_movie.png',
      language: 'Hindi',
      format: '2D',
      genre: 'Action, Romance, Crime',
      certification: 'A',
      cast: 'Emraan Hashmi, Disha Patani, Kay Kay Menon',
      trailer_url: 'https://www.youtube.com/watch?v=qkaSXCqdecM',
      shows: [
        // Day 1
        { venue: pvrDelhi, dayOffset: 1, time: '12:30', format: '2D', language: 'Hindi' },
        { venue: pvrDelhi, dayOffset: 1, time: '16:45', format: '2D', language: 'Hindi' },
        { venue: pvrDelhi, dayOffset: 1, time: '20:30', format: '2D', language: 'Hindi' },
        { venue: inoxDelhi, dayOffset: 1, time: '19:00', format: '2D', language: 'Hindi' },
        { venue: cinepolisMumbai, dayOffset: 1, time: '18:00', format: '2D', language: 'Hindi' },
        { venue: pvrBlr, dayOffset: 1, time: '20:30', format: '2D', language: 'Hindi' },

        // Day 2
        { venue: pvrDelhi, dayOffset: 2, time: '11:00', format: '2D', language: 'Hindi' },
        { venue: pvrDelhi, dayOffset: 2, time: '14:30', format: '2D', language: 'Hindi' },
        { venue: pvrDelhi, dayOffset: 2, time: '18:00', format: '2D', language: 'Hindi' },
        { venue: pvrDelhi, dayOffset: 2, time: '21:45', format: '2D', language: 'Hindi' },
        { venue: inoxDelhi, dayOffset: 2, time: '16:30', format: '2D', language: 'Hindi' },
        { venue: cinepolisMumbai, dayOffset: 2, time: '21:00', format: '2D', language: 'Hindi' },

        // Day 3
        { venue: pvrDelhi, dayOffset: 3, time: '13:00', format: '2D', language: 'Hindi' },
        { venue: pvrDelhi, dayOffset: 3, time: '17:15', format: '2D', language: 'Hindi' },
        { venue: pvrDelhi, dayOffset: 3, time: '21:00', format: '2D', language: 'Hindi' },
        { venue: inoxDelhi, dayOffset: 3, time: '18:45', format: '2D', language: 'Hindi' },
        { venue: pvrBlr, dayOffset: 3, time: '19:00', format: '2D', language: 'Hindi' },

        // Day 4
        { venue: pvrDelhi, dayOffset: 4, time: '12:00', format: '2D', language: 'Hindi' },
        { venue: pvrDelhi, dayOffset: 4, time: '15:45', format: '2D', language: 'Hindi' },
        { venue: pvrDelhi, dayOffset: 4, time: '19:30', format: '2D', language: 'Hindi' },
        { venue: pvrDelhi, dayOffset: 4, time: '22:30', format: '2D', language: 'Hindi' },
        { venue: cinepolisMumbai, dayOffset: 4, time: '17:30', format: '2D', language: 'Hindi' },

        // Day 5
        { venue: pvrDelhi, dayOffset: 5, time: '11:30', format: '2D', language: 'Hindi' },
        { venue: pvrDelhi, dayOffset: 5, time: '15:00', format: '2D', language: 'Hindi' },
        { venue: pvrDelhi, dayOffset: 5, time: '18:45', format: '2D', language: 'Hindi' },
        { venue: inoxDelhi, dayOffset: 5, time: '20:15', format: '2D', language: 'Hindi' },
        { venue: pvrBlr, dayOffset: 5, time: '21:45', format: '2D', language: 'Hindi' },

        // Day 6
        { venue: pvrDelhi, dayOffset: 6, time: '13:30', format: '2D', language: 'Hindi' },
        { venue: pvrDelhi, dayOffset: 6, time: '17:00', format: '2D', language: 'Hindi' },
        { venue: pvrDelhi, dayOffset: 6, time: '20:45', format: '2D', language: 'Hindi' },
        { venue: cinepolisMumbai, dayOffset: 6, time: '19:15', format: '2D', language: 'Hindi' },

        // Day 7
        { venue: pvrDelhi, dayOffset: 7, time: '12:15', format: '2D', language: 'Hindi' },
        { venue: pvrDelhi, dayOffset: 7, time: '16:00', format: '2D', language: 'Hindi' },
        { venue: pvrDelhi, dayOffset: 7, time: '19:45', format: '2D', language: 'Hindi' },
        { venue: inoxDelhi, dayOffset: 7, time: '17:45', format: '2D', language: 'Hindi' }
      ]
    },
    {
      title: 'Batwara 1947',
      type: 'movie',
      description: 'A gripping, emotionally charged period drama centered around a Hindu family caught in the social conflicts of the Partition in Lahore.',
      poster_url: '/event_pics/batwara_movie.png',
      language: 'Hindi',
      format: '2D',
      genre: 'Drama, History',
      certification: 'U/A',
      cast: 'Pankaj Tripathi, Manoj Bajpayee, Sanya Malhotra',
      trailer_url: 'https://www.youtube.com/watch?v=oRsAMzfvVGk',
      shows: [
        // Day 1
        { venue: pvrDelhi, dayOffset: 1, time: '15:00', format: '2D', language: 'Hindi' },
        { venue: pvrDelhi, dayOffset: 1, time: '19:00', format: '2D', language: 'Hindi' },
        { venue: inoxDelhi, dayOffset: 1, time: '17:30', format: '2D', language: 'Hindi' },
        { venue: cinepolisMumbai, dayOffset: 1, time: '18:15', format: '2D', language: 'Hindi' },

        // Day 2
        { venue: pvrDelhi, dayOffset: 2, time: '13:30', format: '2D', language: 'Hindi' },
        { venue: pvrDelhi, dayOffset: 2, time: '17:45', format: '2D', language: 'Hindi' },
        { venue: pvrDelhi, dayOffset: 2, time: '21:30', format: '2D', language: 'Hindi' },
        { venue: pvrBlr, dayOffset: 2, time: '19:00', format: '2D', language: 'Hindi' },

        // Day 3
        { venue: pvrDelhi, dayOffset: 3, time: '14:00', format: '2D', language: 'Hindi' },
        { venue: pvrDelhi, dayOffset: 3, time: '18:30', format: '2D', language: 'Hindi' },
        { venue: inoxDelhi, dayOffset: 3, time: '20:00', format: '2D', language: 'Hindi' },

        // Day 4
        { venue: pvrDelhi, dayOffset: 4, time: '12:30', format: '2D', language: 'Hindi' },
        { venue: pvrDelhi, dayOffset: 4, time: '16:45', format: '2D', language: 'Hindi' },
        { venue: pvrDelhi, dayOffset: 4, time: '20:45', format: '2D', language: 'Hindi' },
        { venue: cinepolisMumbai, dayOffset: 4, time: '19:30', format: '2D', language: 'Hindi' },

        // Day 5
        { venue: pvrDelhi, dayOffset: 5, time: '15:15', format: '2D', language: 'Hindi' },
        { venue: pvrDelhi, dayOffset: 5, time: '19:15', format: '2D', language: 'Hindi' },
        { venue: pvrBlr, dayOffset: 5, time: '20:30', format: '2D', language: 'Hindi' },

        // Day 6
        { venue: pvrDelhi, dayOffset: 6, time: '13:00', format: '2D', language: 'Hindi' },
        { venue: pvrDelhi, dayOffset: 6, time: '17:30', format: '2D', language: 'Hindi' },
        { venue: inoxDelhi, dayOffset: 6, time: '19:00', format: '2D', language: 'Hindi' },

        // Day 7
        { venue: pvrDelhi, dayOffset: 7, time: '14:45', format: '2D', language: 'Hindi' },
        { venue: pvrDelhi, dayOffset: 7, time: '18:45', format: '2D', language: 'Hindi' },
        { venue: cinepolisMumbai, dayOffset: 7, time: '20:45', format: '2D', language: 'Hindi' }
      ]
    },

    // --- 3. SPORTS ---
    {
      title: 'Indian Women\'s League (IWL) 2026',
      type: 'sports',
      description: 'Football (Club League): Indian Women\'s League (IWL) kicks off its top-tier women\'s club season stretching through early January.',
      poster_url: '/event_pics/indiawomen.png',
      language: 'English',
      format: 'Live Stadium',
      genre: 'Football, Tournament',
      certification: 'U',
      cast: 'Gokulam Kerala FC, Odisha FC, Sethu FC',
      trailer_url: 'https://www.youtube.com/watch?v=9bZkp7q19f0',
      shows: [
        { venue: balewadiPune, dayOffset: 1, time: '16:00', format: 'Live Match', language: 'English' },
        { venue: balewadiPune, dayOffset: 2, time: '19:30', format: 'Live Match', language: 'English' },
        { venue: balewadiPune, dayOffset: 3, time: '16:00', format: 'Live Match', language: 'English' },
        { venue: balewadiPune, dayOffset: 4, time: '19:30', format: 'Live Match', language: 'English' },
        { venue: balewadiPune, dayOffset: 5, time: '16:00', format: 'Live Match', language: 'English' },
        { venue: balewadiPune, dayOffset: 6, time: '19:30', format: 'Live Match', language: 'English' },
        { venue: balewadiPune, dayOffset: 7, time: '17:00', format: 'Live Match', language: 'English' }
      ]
    },
    {
      title: 'India vs Afghanistan - Bilateral T20I Series',
      type: 'sports',
      description: 'Cricket (International T20I): India national cricket team vs Afghanistan three-match bilateral T20 series takes place live under stadium lights.',
      poster_url: '/event_pics/indafg.png',
      language: 'Hindi',
      format: 'Live Match',
      genre: 'Cricket, T20I',
      certification: 'U',
      cast: 'Suryakumar Yadav, Hardik Pandya, Rashid Khan',
      trailer_url: 'https://www.youtube.com/watch?v=6v2L2UGZJAQ',
      shows: [
        { venue: noidaStadium, dayOffset: 1, time: '19:00', format: 'Live T20', language: 'Hindi' },
        { venue: noidaStadium, dayOffset: 2, time: '19:00', format: 'Live T20', language: 'Hindi' },
        { venue: noidaStadium, dayOffset: 3, time: '19:00', format: 'Live T20', language: 'Hindi' },
        { venue: noidaStadium, dayOffset: 4, time: '19:00', format: 'Live T20', language: 'Hindi' },
        { venue: noidaStadium, dayOffset: 5, time: '19:00', format: 'Live T20', language: 'Hindi' },
        { venue: wankhedeMumbai, dayOffset: 6, time: '19:30', format: 'Live T20', language: 'Hindi' },
        { venue: wankhedeMumbai, dayOffset: 7, time: '19:30', format: 'Live T20', language: 'Hindi' }
      ]
    },
    {
      title: 'India vs Brazil - Historic International Friendly',
      type: 'sports',
      description: 'Football (International Friendly): A monumental international friendly football clash featuring the Brazilian National Team taking on India.',
      poster_url: '/event_pics/indbrazil.png',
      language: 'English',
      format: 'Live Match',
      genre: 'Football, International',
      certification: 'U',
      cast: 'Vinicius Jr, Rodrygo, Sunil Chhetri, Lallianzuala Chhangte',
      trailer_url: 'https://www.youtube.com/watch?v=7X8R1yTz2Q0',
      shows: [
        { venue: wankhedeMumbai, dayOffset: 1, time: '19:30', format: 'Stadium', language: 'English' },
        { venue: wankhedeMumbai, dayOffset: 2, time: '22:00', format: 'Stadium', language: 'English' },
        { venue: wankhedeMumbai, dayOffset: 3, time: '19:30', format: 'Stadium', language: 'English' },
        { venue: wankhedeMumbai, dayOffset: 4, time: '20:00', format: 'Stadium', language: 'English' },
        { venue: balewadiPune, dayOffset: 5, time: '18:30', format: 'Stadium', language: 'English' },
        { venue: balewadiPune, dayOffset: 6, time: '20:00', format: 'Stadium', language: 'English' }
      ]
    },
    {
      title: '65th National Open Athletics Championships',
      type: 'sports',
      description: 'Athletics (National Championship): India\'s premier track-and-field championship featuring top sprinters, long jumpers, and javelin throwers.',
      poster_url: '/event_pics/athletes.png',
      language: 'Hindi',
      format: 'Live Athletics',
      genre: 'Track & Field, Sports',
      certification: 'U',
      cast: 'Neeraj Chopra, Kishore Jena, Jyothi Yarraji',
      trailer_url: 'https://www.youtube.com/watch?v=5X9m7yTz1Q0',
      shows: [
        { venue: noidaStadium, dayOffset: 1, time: '09:00', format: 'Morning Session', language: 'Hindi' },
        { venue: noidaStadium, dayOffset: 2, time: '16:00', format: 'Evening Session', language: 'Hindi' },
        { venue: noidaStadium, dayOffset: 3, time: '09:00', format: 'Morning Session', language: 'Hindi' },
        { venue: noidaStadium, dayOffset: 4, time: '16:00', format: 'Evening Session', language: 'Hindi' },
        { venue: noidaStadium, dayOffset: 5, time: '16:00', format: 'Finals', language: 'Hindi' },
        { venue: balewadiPune, dayOffset: 6, time: '15:00', format: 'Finals', language: 'Hindi' }
      ]
    },
    {
      title: 'Syed Modi India International 2026',
      type: 'sports',
      description: 'Badminton (BWF World Tour Super 300): International badminton tournament with elite shuttlers fighting for global rankings.',
      poster_url: '/event_pics/syedmodi.png',
      language: 'English',
      format: 'Indoor Court',
      genre: 'Badminton, Tournament',
      certification: 'U',
      cast: 'PV Sindhu, Lakshya Sen, Satwiksairaj Rankireddy',
      trailer_url: 'https://www.youtube.com/watch?v=4X7m8yTz9Q0',
      shows: [
        { venue: gachibowliHyd, dayOffset: 1, time: '10:00', format: 'Prelims', language: 'English' },
        { venue: gachibowliHyd, dayOffset: 2, time: '14:00', format: 'Round 16', language: 'English' },
        { venue: gachibowliHyd, dayOffset: 3, time: '10:00', format: 'Quarterfinals', language: 'English' },
        { venue: gachibowliHyd, dayOffset: 4, time: '14:00', format: 'Semifinals', language: 'English' },
        { venue: gachibowliHyd, dayOffset: 5, time: '15:00', format: 'Finals', language: 'English' },
        { venue: gachibowliHyd, dayOffset: 6, time: '16:00', format: 'Exhibition', language: 'English' }
      ]
    },

    // --- 4. COMEDY ---
    {
      title: 'Anubhav Singh Bassi – Kisi Ko Batana Mat',
      type: 'comedy',
      description: 'Bassi returns to live stages with his smash-hit solo stand-up show "Kisi Ko Batana Mat". Packed with hilarious personal anecdotes, college mishaps, and sharp observational humor.',
      poster_url: '/event_pics/bassi.png',
      language: 'Hindi',
      format: 'Live Standup',
      genre: 'Standup Comedy, Observational',
      certification: 'U/A',
      cast: 'Anubhav Singh Bassi',
      trailer_url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
      shows: [
        { venue: habitatBlr, dayOffset: 1, time: '17:00', format: 'Live Comedy', language: 'Hindi' },
        { venue: habitatBlr, dayOffset: 1, time: '20:00', format: 'Live Comedy', language: 'Hindi' },
        { venue: habitatBlr, dayOffset: 2, time: '18:00', format: 'Live Comedy', language: 'Hindi' },
        { venue: habitatBlr, dayOffset: 3, time: '19:30', format: 'Live Comedy', language: 'Hindi' },
        { venue: habitatBlr, dayOffset: 4, time: '17:00', format: 'Live Comedy', language: 'Hindi' },
        { venue: habitatBlr, dayOffset: 5, time: '20:30', format: 'Live Comedy', language: 'Hindi' },
        { venue: cinepolisMumbai, dayOffset: 6, time: '18:30', format: 'Live Comedy', language: 'Hindi' },
        { venue: cinepolisMumbai, dayOffset: 7, time: '21:00', format: 'Live Comedy', language: 'Hindi' }
      ]
    },
    {
      title: 'Abhishek Upmanyu – TOXIC',
      type: 'comedy',
      description: 'Abhishek Upmanyu brings his popular solo "TOXIC" to major cities, delivering rapid-fire punchlines and hilarious take-downs of modern relationships.',
      poster_url: '/event_pics/abhishek.png',
      language: 'Hindi',
      format: 'Live Standup',
      genre: 'Standup Comedy, Satire',
      certification: 'U/A',
      cast: 'Abhishek Upmanyu',
      trailer_url: 'https://www.youtube.com/watch?v=c0-hvjV2A5Y',
      shows: [
        { venue: habitatBlr, dayOffset: 1, time: '19:00', format: 'Live Comedy', language: 'Hindi' },
        { venue: habitatBlr, dayOffset: 2, time: '18:00', format: 'Live Comedy', language: 'Hindi' },
        { venue: habitatBlr, dayOffset: 3, time: '21:00', format: 'Live Comedy', language: 'Hindi' },
        { venue: habitatBlr, dayOffset: 4, time: '17:30', format: 'Live Comedy', language: 'Hindi' },
        { venue: habitatBlr, dayOffset: 5, time: '20:30', format: 'Live Comedy', language: 'Hindi' },
        { venue: cinepolisMumbai, dayOffset: 6, time: '19:00', format: 'Live Comedy', language: 'Hindi' },
        { venue: cinepolisMumbai, dayOffset: 7, time: '21:30', format: 'Live Comedy', language: 'Hindi' }
      ]
    },
    {
      title: 'Samay Raina – Still Alive',
      type: 'comedy',
      description: 'Comedian and streaming sensation Samay Raina takes the stage with an unfiltered, dark-comedy solo hour filled with unpredictable crowd work.',
      poster_url: '/event_pics/samay.png',
      language: 'Hindi',
      format: 'Live Standup',
      genre: 'Dark Comedy, Crowdwork',
      certification: 'A',
      cast: 'Samay Raina',
      trailer_url: 'https://www.youtube.com/watch?v=1T2bXySg08U',
      shows: [
        { venue: habitatBlr, dayOffset: 1, time: '20:00', format: 'Live Comedy', language: 'Hindi' },
        { venue: habitatBlr, dayOffset: 2, time: '19:30', format: 'Live Comedy', language: 'Hindi' },
        { venue: habitatBlr, dayOffset: 3, time: '18:00', format: 'Live Comedy', language: 'Hindi' },
        { venue: habitatBlr, dayOffset: 4, time: '21:00', format: 'Live Comedy', language: 'Hindi' },
        { venue: habitatBlr, dayOffset: 5, time: '19:00', format: 'Live Comedy', language: 'Hindi' },
        { venue: cinepolisMumbai, dayOffset: 6, time: '20:00', format: 'Live Comedy', language: 'Hindi' },
        { venue: cinepolisMumbai, dayOffset: 7, time: '22:00', format: 'Live Comedy', language: 'Hindi' }
      ]
    },
    {
      title: 'Harsh Gujral – Jo Bolta Hai Wahi Hota Hai',
      type: 'comedy',
      description: 'High-energy, crowd-roasting comedian Harsh Gujral performs his hit tour, delivering non-stop laughter.',
      poster_url: '/event_pics/harsh.png',
      language: 'Hindi',
      format: 'Live Standup',
      genre: 'Crowd Roast, Observational',
      certification: 'U/A',
      cast: 'Harsh Gujral',
      trailer_url: 'https://www.youtube.com/watch?v=y1D11B5zW1w',
      shows: [
        { venue: habitatBlr, dayOffset: 1, time: '17:30', format: 'Live Comedy', language: 'Hindi' },
        { venue: habitatBlr, dayOffset: 1, time: '20:30', format: 'Live Comedy', language: 'Hindi' },
        { venue: habitatBlr, dayOffset: 2, time: '18:00', format: 'Live Comedy', language: 'Hindi' },
        { venue: habitatBlr, dayOffset: 3, time: '21:00', format: 'Live Comedy', language: 'Hindi' },
        { venue: habitatBlr, dayOffset: 4, time: '18:30', format: 'Live Comedy', language: 'Hindi' },
        { venue: habitatBlr, dayOffset: 5, time: '20:30', format: 'Live Comedy', language: 'Hindi' },
        { venue: cinepolisMumbai, dayOffset: 6, time: '19:30', format: 'Live Comedy', language: 'Hindi' },
        { venue: cinepolisMumbai, dayOffset: 7, time: '21:30', format: 'Live Comedy', language: 'Hindi' }
      ]
    },
    {
      title: 'Munawar Faruqui – BEEDI',
      type: 'comedy',
      description: 'Munawar returns with his brand new solo hour BEEDI blending honest storytelling and sharp crowd interaction.',
      poster_url: '/event_pics/munawar.png',
      language: 'Hindi',
      format: 'Live Standup',
      genre: 'Storytelling, Standup',
      certification: 'U/A',
      cast: 'Munawar Faruqui',
      trailer_url: 'https://www.youtube.com/watch?v=kY7m87b3z2M',
      shows: [
        { venue: habitatBlr, dayOffset: 1, time: '18:00', format: 'Live Comedy', language: 'Hindi' },
        { venue: habitatBlr, dayOffset: 2, time: '20:30', format: 'Live Comedy', language: 'Hindi' },
        { venue: habitatBlr, dayOffset: 3, time: '19:00', format: 'Live Comedy', language: 'Hindi' },
        { venue: habitatBlr, dayOffset: 4, time: '21:30', format: 'Live Comedy', language: 'Hindi' },
        { venue: habitatBlr, dayOffset: 5, time: '18:30', format: 'Live Comedy', language: 'Hindi' },
        { venue: cinepolisMumbai, dayOffset: 6, time: '19:00', format: 'Live Comedy', language: 'Hindi' },
        { venue: cinepolisMumbai, dayOffset: 7, time: '21:30', format: 'Live Comedy', language: 'Hindi' }
      ]
    }
  ];

  const baseDate = new Date(2026, 7, 23); // Aug 23, 2026

  for (const item of eventList) {
    const event = await prisma.event.create({
      data: {
        organiser_id: organiser.id,
        title: item.title,
        type: item.type as any,
        description: item.description,
        poster_url: item.poster_url,
        language: item.language,
        format: item.format,
        genre: item.genre,
        certification: item.certification,
        cast: item.cast,
        trailer_url: item.trailer_url
      }
    });

    // Create sample reviews for movie blockbusters
    if (item.type === 'movie') {
      await prisma.review.create({
        data: {
          event_id: event.id,
          customer_id: reviewer1.id,
          rating: 5,
          review_text: `Absolutely mind-blowing cinematic experience! The visuals in ${item.format} were top-notch and cast performances were incredible!`
        }
      });

      await prisma.review.create({
        data: {
          event_id: event.id,
          customer_id: reviewer2.id,
          rating: 4,
          review_text: `Super entertaining movie! Watched it with family at PVR. Great background score and pacing.`
        }
      });
    }

    for (const showSpec of item.shows) {
      const showDate = new Date(baseDate);
      showDate.setDate(baseDate.getDate() + showSpec.dayOffset);

      const venueSeats = await prisma.venueSeat.findMany({ where: { venue_id: showSpec.venue.id } });
      const uniqueCategoryIds = Array.from(new Set(venueSeats.map(s => s.category_id)));

      const pricingData = uniqueCategoryIds.map(catId => {
        let tierPrice = 450;
        if (catId === vipPitCat.id || catId === reclinerCat.id) tierPrice = 600;
        else if (catId === lowerTierCat.id || catId === generalCat.id) tierPrice = 350;
        else if (catId === upperDeckCat.id) tierPrice = 250;

        return {
          category_id: catId,
          price: Math.round(tierPrice)
        };
      });

      const show = await prisma.show.create({
        data: {
          event_id: event.id,
          venue_id: showSpec.venue.id,
          date: showDate,
          time: showSpec.time,
          format: showSpec.format,
          language: showSpec.language
        }
      });

      await prisma.showCategoryPricing.createMany({
        data: pricingData.map(p => ({
          show_id: show.id,
          category_id: p.category_id,
          price: p.price
        }))
      });

      await prisma.seatStatus.createMany({
        data: venueSeats.map(seat => ({
          show_id: show.id,
          venue_seat_id: seat.id,
          status: 'available'
        }))
      });
    }
  }

  console.log('Database successfully seeded with cinema chains, metadata, trailers, addons & reviews!');
}

main()
  .catch(e => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
