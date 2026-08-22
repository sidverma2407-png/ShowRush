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
  console.log('Clearing old data and seeding database with real-world Indian events with 2, 3, and 4 live shows per event...');

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

  // Seat Categories
  const vipPitCat = await getCategory('VIP Lounge');
  const goldenCircleCat = await getCategory('Golden Circle');
  const lowerTierCat = await getCategory('Lower Stand');
  const upperDeckCat = await getCategory('Upper Pavilion');
  const reclinerCat = await getCategory('IMAX Recliner');
  const generalCat = await getCategory('General Admission');

  // --- REAL VENUES ---
  const pvrDelhi = await prisma.venue.create({
    data: { name: "PVR Director's Cut, Ambience Mall", address: 'Vasant Kunj', city: 'Delhi NCR', created_by: admin.id }
  });

  const jioMumbai = await prisma.venue.create({
    data: { name: 'Jio World Garden, BKC', address: 'Bandra Kurla Complex', city: 'Mumbai', created_by: admin.id }
  });

  const wankhedeMumbai = await prisma.venue.create({
    data: { name: 'Wankhede Cricket Stadium', address: 'Churchgate', city: 'Mumbai', created_by: admin.id }
  });

  const noidaStadium = await prisma.venue.create({
    data: { name: 'Noida International Cricket Stadium', address: 'Sector 21A', city: 'Noida', created_by: admin.id }
  });

  const habitatBlr = await prisma.venue.create({
    data: { name: 'The Habitat Comedy Lounge', address: 'Koramangala 5th Block', city: 'Bengaluru', created_by: admin.id }
  });

  const chinnaswamyBlr = await prisma.venue.create({
    data: { name: 'M. Chinnaswamy Stadium', address: 'MG Road', city: 'Bengaluru', created_by: admin.id }
  });

  const balewadiPune = await prisma.venue.create({
    data: { name: 'Shree Shiv Chhatrapati Sports Complex', address: 'Balewadi', city: 'Pune', created_by: admin.id }
  });

  const gachibowliHyd = await prisma.venue.create({
    data: { name: 'Gachibowli Indoor Arena', address: 'Gachibowli', city: 'Hyderabad', created_by: admin.id }
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

  await createLayout(pvrDelhi.id, [
    { rows: ['A', 'B', 'C'], catId: generalCat.id },
    { rows: ['D', 'E'], catId: reclinerCat.id }
  ], 12);

  await createLayout(jioMumbai.id, [
    { rows: ['A', 'B'], catId: vipPitCat.id },
    { rows: ['C', 'D'], catId: goldenCircleCat.id },
    { rows: ['E', 'F'], catId: lowerTierCat.id },
    { rows: ['G', 'H'], catId: upperDeckCat.id }
  ], 16);

  await createLayout(wankhedeMumbai.id, [
    { rows: ['A', 'B'], catId: vipPitCat.id },
    { rows: ['C', 'D', 'E'], catId: lowerTierCat.id },
    { rows: ['F', 'G'], catId: upperDeckCat.id }
  ], 16);

  await createLayout(noidaStadium.id, [
    { rows: ['A', 'B'], catId: vipPitCat.id },
    { rows: ['C', 'D', 'E'], catId: lowerTierCat.id },
    { rows: ['F', 'G'], catId: upperDeckCat.id }
  ], 16);

  await createLayout(habitatBlr.id, [
    { rows: ['A', 'B'], catId: goldenCircleCat.id },
    { rows: ['C', 'D'], catId: generalCat.id }
  ], 10);

  await createLayout(chinnaswamyBlr.id, [
    { rows: ['A', 'B'], catId: vipPitCat.id },
    { rows: ['C', 'D', 'E'], catId: lowerTierCat.id },
    { rows: ['F', 'G', 'H'], catId: upperDeckCat.id }
  ], 16);

  await createLayout(balewadiPune.id, [
    { rows: ['A', 'B'], catId: vipPitCat.id },
    { rows: ['C', 'D'], catId: lowerTierCat.id },
    { rows: ['E', 'F'], catId: upperDeckCat.id }
  ], 14);

  await createLayout(gachibowliHyd.id, [
    { rows: ['A', 'B'], catId: vipPitCat.id },
    { rows: ['C', 'D', 'E'], catId: goldenCircleCat.id },
    { rows: ['F', 'G'], catId: lowerTierCat.id },
    { rows: ['H', 'I'], catId: upperDeckCat.id }
  ], 14);

  // --- 20 EXACT USER SPECIFIED EVENTS (DATED AFTER AUG 24, 2026) WITH 2, 3, AND 4 SHOWS EACH ---
  const eventList = [
    // --- 1. CONCERTS ---
    {
      title: 'A.R. Rahman – The Wonderment Tour Live',
      type: 'concert',
      description: 'The Oscar and Grammy-winning musical maestro is hosting a rare, massive live arena performance. The concert will feature a full live orchestra, state-of-the-art immersive visual production, and a definitive journey through his legendary catalog.',
      poster_url: '/event_pics/concert2.png',
      venue: chinnaswamyBlr,
      price: 3500.00,
      cat: vipPitCat.id,
      shows: [
        { dayOffset: 41, time: '19:00' }, // Saturday, Oct 3, 2026
        { dayOffset: 42, time: '19:00' },
        { dayOffset: 43, time: '18:30' }
      ]
    },
    {
      title: 'Fred again.. – Debut India Tour',
      type: 'concert',
      description: 'The international electronic music sensation is bringing his highly anticipated live show to India for the first time. The open-air festival tour spans major metropolitan cities, performing hits from his Actual Life series to his latest USB releases.',
      poster_url: '/event_pics/concert3.png',
      venue: noidaStadium,
      price: 2999.00,
      cat: goldenCircleCat.id,
      shows: [
        { dayOffset: 104, time: '17:00' }, // Saturday, Dec 5, 2026
        { dayOffset: 104, time: '21:00' },
        { dayOffset: 111, time: '18:00' }, // Saturday, Dec 12, 2026
        { dayOffset: 111, time: '21:30' }
      ]
    },
    {
      title: 'Sonu Nigam – Satrangi Re India Tour',
      type: 'concert',
      description: 'One of Bollywood’s most iconic playback singers is launching a massive multi-city stadium tour conceptualized by NR Talent & Event Management. The grand outdoor concept navigates the "seven colors" of romantic music and emotions.',
      poster_url: '/event_pics/concert1.png',
      venue: gachibowliHyd,
      price: 2200.00,
      cat: lowerTierCat.id,
      shows: [
        { dayOffset: 120, time: '19:30' }, // Monday, Dec 21, 2026
        { dayOffset: 121, time: '19:30' }
      ]
    },
    {
      title: 'Orchestral Qawwali Project – India Debut Tour',
      type: 'concert',
      description: 'Led by composer Rushil Ranjan and singer Abi Sampa, this globally acclaimed ensemble seamlessly blends Western classical orchestration, choral arrangements, and traditional Sufi Qawwali following sell-out shows at London\'s Royal Albert Hall.',
      poster_url: '/event_pics/concert4.png',
      venue: jioMumbai,
      price: 2500.00,
      cat: goldenCircleCat.id,
      shows: [
        { dayOffset: 20, time: '18:00' }, // Saturday, Sept 12, 2026
        { dayOffset: 21, time: '19:00' }, // Sunday, Sept 13, 2026
        { dayOffset: 22, time: '19:30' }
      ]
    },
    {
      title: 'Film Expo India – 5-Day Mega Music Festival',
      type: 'concert',
      description: 'A massive five-day music, devotion, and pop-culture exhibition featuring heavyweights from across Indian music scenes, including Sufi melodies, massive Bollywood sets, and classical live performance nights. Headliners include Anup Jalota, Malini Awasthi, Madhubanti Bagchi, and Afsana Khan.',
      poster_url: '/event_pics/concert5.png',
      venue: noidaStadium,
      price: 1800.00,
      cat: lowerTierCat.id,
      shows: [
        { dayOffset: 3, time: '19:00' }, // Wednesday, Aug 26, 2026
        { dayOffset: 4, time: '19:00' },
        { dayOffset: 5, time: '18:30' },
        { dayOffset: 6, time: '19:30' }
      ]
    },

    // --- 2. MOVIES ---
    {
      title: 'Spider-Man: Brand New Day',
      type: 'movie',
      description: 'Tom Holland swings back onto the big screen in this highly-anticipated Marvel blockbuster, serving as a major theatrical draw across Indian multiplexes.',
      poster_url: '/event_pics/spiderman_movie.png',
      venue: pvrDelhi,
      price: 480.00,
      cat: reclinerCat.id,
      shows: [
        { dayOffset: 5, time: '11:00' },
        { dayOffset: 5, time: '15:15' },
        { dayOffset: 5, time: '18:30' },
        { dayOffset: 5, time: '21:45' }
      ]
    },
    {
      title: 'Odyssey',
      type: 'movie',
      description: 'A grand historical epic starring Ralph Fiennes and Juliette Binoche, retelling Homer\'s classic tale of Odysseus returning home from the Trojan War.',
      poster_url: '/event_pics/odyssey_movie.png',
      venue: pvrDelhi,
      price: 450.00,
      cat: reclinerCat.id,
      shows: [
        { dayOffset: 8, time: '13:00' },
        { dayOffset: 8, time: '17:00' },
        { dayOffset: 8, time: '21:00' }
      ]
    },
    {
      title: 'The End of Oak Street',
      type: 'movie',
      description: 'A multi-lingual sci-fi adventure starring Anne Hathaway, where an entire suburban neighborhood is mysteriously transported back to the prehistoric age of dinosaurs.',
      poster_url: '/event_pics/oakstreet_movie.png',
      venue: pvrDelhi,
      price: 420.00,
      cat: reclinerCat.id,
      shows: [
        { dayOffset: 12, time: '14:00' },
        { dayOffset: 12, time: '18:00' },
        { dayOffset: 12, time: '21:30' }
      ]
    },
    {
      title: 'Awarapan 2',
      type: 'movie',
      description: 'Emraan Hashmi returns as Shivam Pandit after nearly two decades in this intense, action-packed gangster romance sequel.',
      poster_url: '/event_pics/awara_movie.png',
      venue: pvrDelhi,
      price: 400.00,
      cat: reclinerCat.id,
      shows: [
        { dayOffset: 16, time: '12:30' },
        { dayOffset: 16, time: '16:45' },
        { dayOffset: 16, time: '20:30' }
      ]
    },
    {
      title: 'Batwara 1947',
      type: 'movie',
      description: 'A gripping, emotionally charged period drama centered around a Hindu family caught in the social conflicts of the Partition in Lahore.',
      poster_url: '/event_pics/batwara_movie.png',
      venue: pvrDelhi,
      price: 380.00,
      cat: reclinerCat.id,
      shows: [
        { dayOffset: 20, time: '15:00' },
        { dayOffset: 20, time: '19:00' }
      ]
    },

    // --- 3. SPORTS ---
    {
      title: 'Indian Women\'s League (IWL) 2026',
      type: 'sports',
      description: 'Football (Club League): Indian Women\'s League (IWL) kicks off its top-tier women\'s club season stretching through early January.',
      poster_url: '/event_pics/sports1.png',
      venue: balewadiPune,
      price: 499.00,
      cat: lowerTierCat.id,
      shows: [
        { dayOffset: 11, time: '16:00' }, // Sept 3, 2026
        { dayOffset: 11, time: '19:30' }
      ]
    },
    {
      title: 'India vs Afghanistan - Bilateral T20I Series',
      type: 'sports',
      description: 'Cricket (International T20I): India national cricket team vs Afghanistan three-match bilateral T20 series takes place live under stadium lights.',
      poster_url: '/event_pics/sports2.png',
      venue: noidaStadium,
      price: 1999.00,
      cat: lowerTierCat.id,
      shows: [
        { dayOffset: 21, time: '19:00' }, // Sept 13, 2026
        { dayOffset: 23, time: '19:00' }, // Sept 15, 2026
        { dayOffset: 25, time: '19:00' }  // Sept 17, 2026
      ]
    },
    {
      title: 'India vs Brazil - Historic International Friendly',
      type: 'sports',
      description: 'Football (International Friendly): India vs Brazil historic international friendly match for which the national team intentionally withdrew from the ASEAN Cup.',
      poster_url: '/event_pics/sports3.png',
      venue: wankhedeMumbai,
      price: 2500.00,
      cat: lowerTierCat.id,
      shows: [
        { dayOffset: 41, time: '16:00' }, // Oct 3, 2026
        { dayOffset: 41, time: '20:00' }
      ]
    },
    {
      title: '65th National Open Athletics Championships',
      type: 'sports',
      description: 'Athletics: 65th National Open Athletics Championships organized by the Athletics Federation of India featuring top national track and field stars.',
      poster_url: '/event_pics/sports4.png',
      venue: noidaStadium,
      price: 350.00,
      cat: upperDeckCat.id,
      shows: [
        { dayOffset: 46, time: '09:00' }, // Oct 8, 2026
        { dayOffset: 47, time: '09:00' }, // Oct 9, 2026
        { dayOffset: 49, time: '16:00' }  // Oct 11, 2026
      ]
    },
    {
      title: 'Syed Modi India International 2026',
      type: 'sports',
      description: 'Badminton: Syed Modi India International, a major BWF World Tour event, hosting global badminton stars in Lucknow.',
      poster_url: '/event_pics/sports5.png',
      venue: gachibowliHyd,
      price: 650.00,
      cat: vipPitCat.id,
      shows: [
        { dayOffset: 93, time: '10:00' }, // Nov 24, 2026
        { dayOffset: 96, time: '14:00' }, // Nov 27, 2026
        { dayOffset: 98, time: '16:00' }  // Nov 29, 2026
      ]
    },

    // --- 4. COMEDY ---
    {
      title: 'Anubhav Singh Bassi – Kisi Ko Batana Mat',
      type: 'comedy',
      description: 'Bassi is packing auditoriums with his hilarious, nostalgic storytelling format detailing his chaotic college days and everyday life.',
      poster_url: '/event_pics/comedy2.png',
      venue: habitatBlr,
      price: 799.00,
      cat: generalCat.id,
      shows: [
        { dayOffset: 10, time: '17:00' },
        { dayOffset: 10, time: '20:00' },
        { dayOffset: 21, time: '19:30' }
      ]
    },
    {
      title: 'Abhishek Upmanyu – TOXIC',
      type: 'comedy',
      description: 'Known for his lightning-fast delivery and sharp, cynical observational style, Upmanyu\'s new special TOXIC is sweeping major cities.',
      poster_url: '/event_pics/comedy1.png',
      venue: habitatBlr,
      price: 899.00,
      cat: generalCat.id,
      shows: [
        { dayOffset: 6, time: '19:00' },  // Aug 29, 2026
        { dayOffset: 26, time: '18:00' }, // Sept 18, 2026
        { dayOffset: 35, time: '20:00' }  // Sept 27, 2026
      ]
    },
    {
      title: 'Samay Raina – Still Alive',
      type: 'comedy',
      description: 'Blending dark humor and freewheeling crowd interaction, Samay is dropping into experimental club tapings alongside surprise top-tier acts.',
      poster_url: '/event_pics/comedy3.png',
      venue: habitatBlr,
      price: 999.00,
      cat: generalCat.id,
      shows: [
        { dayOffset: 4, time: '21:00' }, // Aug 27, 2026
        { dayOffset: 7, time: '21:00' }, // Aug 30, 2026
        { dayOffset: 9, time: '22:00' }  // Sept 1, 2026
      ]
    },
    {
      title: 'Harsh Gujral – Jo Bolta Hai Wahi Hota Hai',
      type: 'comedy',
      description: 'Renowned as the undisputed king of relentless front-row crowd-roasting and raw, high-energy North Indian observational humor.',
      poster_url: '/event_pics/comedy4.png',
      venue: habitatBlr,
      price: 699.00,
      cat: generalCat.id,
      shows: [
        { dayOffset: 15, time: '16:00' },
        { dayOffset: 15, time: '18:30' },
        { dayOffset: 15, time: '21:00' },
        { dayOffset: 16, time: '19:30' }
      ]
    },
    {
      title: 'Munawar Faruqui – BEEDI',
      type: 'comedy',
      description: 'Following massive reality television triumphs and completely sold-out national stadium runs, Munawar returns with his brand new solo hour BEEDI blending honest storytelling and sharp crowd interaction.',
      poster_url: '/event_pics/comedy5.png',
      venue: habitatBlr,
      price: 850.00,
      cat: generalCat.id,
      shows: [
        { dayOffset: 97, time: '18:00' }, // Nov 28, 2026
        { dayOffset: 98, time: '20:30' }  // Nov 29, 2026
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
        poster_url: item.poster_url
      }
    });

    const venueSeats = await prisma.venueSeat.findMany({ where: { venue_id: item.venue.id } });

    // Find all distinct categories present in this venue's seats
    const uniqueCategoryIds = Array.from(new Set(venueSeats.map(s => s.category_id)));

    const pricingData = uniqueCategoryIds.map(catId => {
      let tierPrice = item.price;
      if (catId === vipPitCat.id || catId === reclinerCat.id) tierPrice = item.price * 1.5;
      else if (catId === lowerTierCat.id || catId === generalCat.id) tierPrice = item.price * 0.8;
      else if (catId === upperDeckCat.id) tierPrice = item.price * 0.5;

      return {
        category_id: catId,
        price: Math.round(tierPrice)
      };
    });

    // Seed multiple live show timings per event (2, 3, or 4 shows)
    for (const showSpec of item.shows) {
      const showDate = new Date(baseDate);
      showDate.setDate(baseDate.getDate() + showSpec.dayOffset);

      const show = await prisma.show.create({
        data: {
          event_id: event.id,
          venue_id: item.venue.id,
          date: showDate,
          time: showSpec.time
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

  console.log('Database successfully seeded with 20 events having a mix of 2, 3, and 4 live shows per event!');
}

main()
  .catch(e => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
