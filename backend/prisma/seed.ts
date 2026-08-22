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

  // --- 20 REAL WORLD EVENTS WITH MULTIPLE SHOW TIMINGS ---
  const eventList = [
    // CONCERTS
    {
      title: 'Coldplay: Music Of The Spheres World Tour',
      type: 'concert',
      description: 'The global stadium phenomenon featuring LED wristbands, pyrotechnics, and iconic anthems live in Mumbai.',
      poster_url: '/event_pics/concert1.png',
      venue: jioMumbai,
      price: 3500.00,
      cat: goldenCircleCat.id,
      shows: [
        { dayOffset: 2, time: '16:00' },
        { dayOffset: 2, time: '19:30' },
        { dayOffset: 3, time: '19:30' }
      ]
    },
    {
      title: 'A.R. Rahman: Symphony of Hope Live',
      type: 'concert',
      description: 'Oscar & Grammy maestro A.R. Rahman performs live with a full 60-piece symphony orchestra.',
      poster_url: '/event_pics/concert2.png',
      venue: jioMumbai,
      price: 2800.00,
      cat: vipPitCat.id,
      shows: [
        { dayOffset: 4, time: '18:00' },
        { dayOffset: 5, time: '19:30' }
      ]
    },
    {
      title: 'Sunburn EDM Arena Festival',
      type: 'concert',
      description: 'Asia’s largest electronic dance music arena featuring top international DJs and massive laser light shows.',
      poster_url: '/event_pics/concert3.png',
      venue: gachibowliHyd,
      price: 2000.00,
      cat: goldenCircleCat.id,
      shows: [
        { dayOffset: 6, time: '15:00' },
        { dayOffset: 6, time: '19:00' },
        { dayOffset: 7, time: '17:00' },
        { dayOffset: 7, time: '21:00' }
      ]
    },
    {
      title: 'Karan Aujla: It Was All A Dream Tour',
      type: 'concert',
      description: 'Punjabi music sensation Karan Aujla live in concert performing his chart-topping hits with live band.',
      poster_url: '/event_pics/concert4.png',
      venue: noidaStadium,
      price: 2500.00,
      cat: lowerTierCat.id,
      shows: [
        { dayOffset: 8, time: '17:30' },
        { dayOffset: 8, time: '20:30' },
        { dayOffset: 9, time: '19:00' }
      ]
    },
    {
      title: 'Diljit Dosanjh: Dil-Luminati India Tour',
      type: 'concert',
      description: 'Global superstar Diljit Dosanjh brings his explosive Dil-Luminati stadium spectacle live to Bengaluru.',
      poster_url: '/event_pics/concert5.png',
      venue: chinnaswamyBlr,
      price: 3200.00,
      cat: goldenCircleCat.id,
      shows: [
        { dayOffset: 10, time: '18:00' },
        { dayOffset: 11, time: '19:30' }
      ]
    },

    // MOVIES
    {
      title: 'Stree 2: Sarkate Ka Aatank (IMAX)',
      type: 'movie',
      description: 'The legendary horror-comedy blockbuster returns as Chanderi faces the terrifying headless myth Sarkata.',
      poster_url: '/event_pics/movie1.png',
      venue: pvrDelhi,
      price: 450.00,
      cat: reclinerCat.id,
      shows: [
        { dayOffset: 2, time: '11:00' },
        { dayOffset: 2, time: '15:15' },
        { dayOffset: 2, time: '18:30' },
        { dayOffset: 2, time: '21:45' }
      ]
    },
    {
      title: 'Kalki 2898 AD (IMAX 3D)',
      type: 'movie',
      description: 'Prabhas and Amitabh Bachchan star in Nag Ashwin’s epic futuristic mythological sci-fi spectacle.',
      poster_url: '/event_pics/movie2.png',
      venue: pvrDelhi,
      price: 500.00,
      cat: reclinerCat.id,
      shows: [
        { dayOffset: 3, time: '13:00' },
        { dayOffset: 3, time: '17:00' },
        { dayOffset: 3, time: '21:00' }
      ]
    },
    {
      title: 'Deadpool & Wolverine (IMAX 3D)',
      type: 'movie',
      description: 'Marvel Studios ultimate team-up as the Merc with a Mouth joins forces with Wolverine in full 3D.',
      poster_url: '/event_pics/movie3.png',
      venue: pvrDelhi,
      price: 480.00,
      cat: reclinerCat.id,
      shows: [
        { dayOffset: 5, time: '14:00' },
        { dayOffset: 5, time: '18:00' },
        { dayOffset: 5, time: '21:30' }
      ]
    },
    {
      title: 'Pushpa 2: The Rule (Dolby Atmos)',
      type: 'movie',
      description: 'Allu Arjun returns as Pushpa Raj in the grand action finale dominating the red sandalwood empire.',
      poster_url: '/event_pics/movie4.png',
      venue: pvrDelhi,
      price: 450.00,
      cat: reclinerCat.id,
      shows: [
        { dayOffset: 7, time: '12:30' },
        { dayOffset: 7, time: '16:45' },
        { dayOffset: 7, time: '20:30' },
        { dayOffset: 8, time: '19:00' }
      ]
    },
    {
      title: 'Gladiator II (IMAX 70mm)',
      type: 'movie',
      description: 'Ridley Scott returns to the Colosseum in an epic sequel depicting power, revenge, and Roman glory.',
      poster_url: '/event_pics/movie5.png',
      venue: pvrDelhi,
      price: 550.00,
      cat: reclinerCat.id,
      shows: [
        { dayOffset: 9, time: '15:00' },
        { dayOffset: 9, time: '19:00' }
      ]
    },

    // COMEDY
    {
      title: 'Zakir Khan: Tathastu & Unfiltered Live',
      type: 'comedy',
      description: 'India’s Sakht Launda Zakir Khan brings his brand new hour of relatable storytelling and razor-sharp punchlines.',
      poster_url: '/event_pics/comedy1.png',
      venue: habitatBlr,
      price: 799.00,
      cat: generalCat.id,
      shows: [
        { dayOffset: 2, time: '17:00' },
        { dayOffset: 2, time: '20:00' },
        { dayOffset: 3, time: '19:00' }
      ]
    },
    {
      title: 'Anubhav Singh Bassi: Bas Kar Bassi',
      type: 'comedy',
      description: 'Bassi shares hilarious hostel memories, college nostalgia, and real-life misadventures live in Bengaluru.',
      poster_url: '/event_pics/comedy2.png',
      venue: habitatBlr,
      price: 699.00,
      cat: generalCat.id,
      shows: [
        { dayOffset: 4, time: '16:30' },
        { dayOffset: 4, time: '19:30' }
      ]
    },
    {
      title: 'Samay Raina: Unfiltered Standup Tour',
      type: 'comedy',
      description: 'The king of dark humor and crowd work Samay Raina performs his raw, unscripted live comedy show.',
      poster_url: '/event_pics/comedy3.png',
      venue: habitatBlr,
      price: 899.00,
      cat: generalCat.id,
      shows: [
        { dayOffset: 6, time: '17:30' },
        { dayOffset: 6, time: '21:00' },
        { dayOffset: 7, time: '20:00' }
      ]
    },
    {
      title: 'Harsh Gujral: Jo Bolta Hai Wohi Hota Hai',
      type: 'comedy',
      description: 'Harsh Gujral brings his quick-witted North Indian observational comedy and interactive crowd roasting.',
      poster_url: '/event_pics/comedy4.png',
      venue: habitatBlr,
      price: 599.00,
      cat: generalCat.id,
      shows: [
        { dayOffset: 8, time: '16:00' },
        { dayOffset: 8, time: '18:30' },
        { dayOffset: 8, time: '21:00' },
        { dayOffset: 9, time: '19:30' }
      ]
    },
    {
      title: 'Biswa Kalyan Rath: Live Standup Special',
      type: 'comedy',
      description: 'Biswa Mast Aadmi delivers hilarious analytical breakdowns of everyday Indian life and human behavior.',
      poster_url: '/event_pics/comedy5.png',
      venue: habitatBlr,
      price: 749.00,
      cat: generalCat.id,
      shows: [
        { dayOffset: 10, time: '18:00' },
        { dayOffset: 10, time: '20:30' }
      ]
    },

    // SPORTS
    {
      title: 'India vs England T20 International Series',
      type: 'sports',
      description: 'High-voltage T20 international cricket clash under stadium lights at Wankhede Stadium, Mumbai.',
      poster_url: '/event_pics/sports1.png',
      venue: wankhedeMumbai,
      price: 1800.00,
      cat: lowerTierCat.id,
      shows: [
        { dayOffset: 3, time: '14:30' },
        { dayOffset: 3, time: '19:00' }
      ]
    },
    {
      title: 'IPL Night: Mumbai Indians vs Chennai Super Kings',
      type: 'sports',
      description: 'The blockbuster El Clásico of Indian cricket! Rohit Sharma vs MS Dhoni in a roaring stadium thriller.',
      poster_url: '/event_pics/sports2.png',
      venue: wankhedeMumbai,
      price: 2500.00,
      cat: lowerTierCat.id,
      shows: [
        { dayOffset: 5, time: '15:30' },
        { dayOffset: 5, time: '19:30' },
        { dayOffset: 6, time: '19:30' }
      ]
    },
    {
      title: 'ISL Final: Mohun Bagan vs Mumbai City FC',
      type: 'sports',
      description: 'The pinnacle of Indian football! Two powerhouse football clubs battle for 90 minutes for the ISL Trophy.',
      poster_url: '/event_pics/sports3.png',
      venue: balewadiPune,
      price: 999.00,
      cat: upperDeckCat.id,
      shows: [
        { dayOffset: 7, time: '16:00' },
        { dayOffset: 7, time: '19:30' }
      ]
    },
    {
      title: 'Pro Kabaddi League Championship Final',
      type: 'sports',
      description: 'High-intensity raids, tackles, and non-stop kabaddi adrenaline live inside the Gachibowli Arena.',
      poster_url: '/event_pics/sports4.png',
      venue: gachibowliHyd,
      price: 750.00,
      cat: vipPitCat.id,
      shows: [
        { dayOffset: 9, time: '17:00' },
        { dayOffset: 9, time: '20:00' },
        { dayOffset: 10, time: '19:30' }
      ]
    },
    {
      title: 'Formula 1 Indian Night Grand Prix 2026',
      type: 'sports',
      description: 'The ultimate motorsport spectacle! 200mph night circuit racing under towering stadium illuminations.',
      poster_url: '/event_pics/sports5.png',
      venue: noidaStadium,
      price: 4500.00,
      cat: lowerTierCat.id,
      shows: [
        { dayOffset: 11, time: '16:00' },
        { dayOffset: 11, time: '20:00' },
        { dayOffset: 12, time: '19:00' },
        { dayOffset: 12, time: '22:00' }
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
