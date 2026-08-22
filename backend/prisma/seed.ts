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
  console.log('Clearing old data and seeding database with real-world Indian events after Aug 24, 2026...');

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
  const premiumCat = await getCategory('Executive');
  const standardCat = await getCategory('Standard');
  const generalCat = await getCategory('General Admission');

  // --- REAL VENUES ---
  // 1. PVR Director's Cut (Delhi NCR)
  const pvrDelhi = await prisma.venue.create({
    data: { name: "PVR Director's Cut, Ambience Mall", address: 'Vasant Kunj', city: 'Delhi NCR', created_by: admin.id }
  });

  // 2. Jio World Garden (Mumbai)
  const jioMumbai = await prisma.venue.create({
    data: { name: 'Jio World Garden, BKC', address: 'Bandra Kurla Complex', city: 'Mumbai', created_by: admin.id }
  });

  // 3. Wankhede Stadium (Mumbai)
  const wankhedeMumbai = await prisma.venue.create({
    data: { name: 'Wankhede Cricket Stadium', address: 'Churchgate', city: 'Mumbai', created_by: admin.id }
  });

  // 4. Noida International Cricket Stadium (Noida)
  const noidaStadium = await prisma.venue.create({
    data: { name: 'Noida International Cricket Stadium', address: 'Sector 21A', city: 'Noida', created_by: admin.id }
  });

  // 5. The Habitat Comedy Lounge (Bengaluru)
  const habitatBlr = await prisma.venue.create({
    data: { name: 'The Habitat Comedy Lounge', address: 'Koramangala 5th Block', city: 'Bengaluru', created_by: admin.id }
  });

  // 6. M. Chinnaswamy Stadium (Bengaluru)
  const chinnaswamyBlr = await prisma.venue.create({
    data: { name: 'M. Chinnaswamy Stadium', address: 'MG Road', city: 'Bengaluru', created_by: admin.id }
  });

  // 7. Balewadi Sports Complex (Pune)
  const balewadiPune = await prisma.venue.create({
    data: { name: 'Shree Shiv Chhatrapati Sports Complex', address: 'Balewadi', city: 'Pune', created_by: admin.id }
  });

  // 8. Gachibowli Arena (Hyderabad)
  const gachibowliHyd = await prisma.venue.create({
    data: { name: 'Gachibowli Indoor Arena', address: 'Gachibowli', city: 'Hyderabad', created_by: admin.id }
  });

  // Create seat layouts for venues
  const createLayout = async (venueId: string, rows: string[], cols: number, catId: string) => {
    const seats = [];
    for (const row of rows) {
      for (let c = 1; c <= cols; c++) {
        seats.push({ venue_id: venueId, row_label: row, seat_number: c, category_id: catId });
      }
    }
    await prisma.venueSeat.createMany({ data: seats });
  };

  await createLayout(pvrDelhi.id, ['A', 'B', 'C', 'D', 'E'], 12, reclinerCat.id);
  await createLayout(jioMumbai.id, ['A', 'B', 'C', 'D', 'E', 'F'], 16, goldenCircleCat.id);
  await createLayout(wankhedeMumbai.id, ['A', 'B', 'C', 'D', 'E', 'F', 'G'], 16, lowerTierCat.id);
  await createLayout(noidaStadium.id, ['A', 'B', 'C', 'D', 'E', 'F'], 16, lowerTierCat.id);
  await createLayout(habitatBlr.id, ['A', 'B', 'C', 'D'], 10, generalCat.id);
  await createLayout(chinnaswamyBlr.id, ['A', 'B', 'C', 'D', 'E', 'F'], 16, lowerTierCat.id);
  await createLayout(balewadiPune.id, ['A', 'B', 'C', 'D', 'E'], 14, upperDeckCat.id);
  await createLayout(gachibowliHyd.id, ['A', 'B', 'C', 'D', 'E'], 14, vipPitCat.id);

  // --- 20 REAL WORLD EVENTS AFTER AUGUST 24, 2026 ---
  const eventList = [
    // 🎵 CONCERTS
    {
      title: 'Coldplay: Music Of The Spheres World Tour',
      type: 'concert',
      description: 'The global stadium phenomenon featuring LED wristbands, pyrotechnics, and iconic anthems live in Mumbai.',
      poster_url: '/event_pics/concert_1.png',
      venue: jioMumbai,
      dateOffset: 2, // Aug 25
      time: '19:30',
      price: 3500.00,
      cat: goldenCircleCat.id
    },
    {
      title: 'A.R. Rahman: Symphony of Hope Live',
      type: 'concert',
      description: 'Oscar & Grammy maestro A.R. Rahman performs live with a full 60-piece symphony orchestra.',
      poster_url: '/event_pics/concert_2.png',
      venue: jioMumbai,
      dateOffset: 4, // Aug 27
      time: '19:00',
      price: 2800.00,
      cat: vipPitCat.id
    },
    {
      title: 'Sunburn EDM Arena Festival',
      type: 'concert',
      description: 'Asia’s largest electronic dance music arena featuring top international DJs and massive laser light shows.',
      poster_url: '/event_pics/concert_3.png',
      venue: gachibowliHyd,
      dateOffset: 6, // Aug 29
      time: '18:00',
      price: 2000.00,
      cat: goldenCircleCat.id
    },
    {
      title: 'Karan Aujla: It Was All A Dream Tour',
      type: 'concert',
      description: 'Punjabi music sensation Karan Aujla live in concert performing his chart-topping hits with live band.',
      poster_url: '/event_pics/concert_4.png',
      venue: noidaStadium,
      dateOffset: 8, // Aug 31
      time: '20:00',
      price: 2500.00,
      cat: lowerTierCat.id
    },
    {
      title: 'Diljit Dosanjh: Dil-Luminati India Tour',
      type: 'concert',
      description: 'Global superstar Diljit Dosanjh brings his explosive Dil-Luminati stadium spectacle live to Bengaluru.',
      poster_url: '/event_pics/concert_5.png',
      venue: chinnaswamyBlr,
      dateOffset: 10, // Sep 2
      time: '19:30',
      price: 3200.00,
      cat: goldenCircleCat.id
    },

    // 🎬 MOVIES
    {
      title: 'Stree 2: Sarkate Ka Aatank (IMAX)',
      type: 'movie',
      description: 'The legendary horror-comedy blockbuster returns as Chanderi faces the terrifying headless myth Sarkata.',
      poster_url: '/event_pics/movie_1.png',
      venue: pvrDelhi,
      dateOffset: 2, // Aug 25
      time: '18:30',
      price: 450.00,
      cat: reclinerCat.id
    },
    {
      title: 'Kalki 2898 AD (IMAX 3D)',
      type: 'movie',
      description: 'Prabhas and Amitabh Bachchan star in Nag Ashwin’s epic futuristic mythological sci-fi spectacle.',
      poster_url: '/event_pics/movie_2.png',
      venue: pvrDelhi,
      dateOffset: 3, // Aug 26
      time: '21:00',
      price: 500.00,
      cat: reclinerCat.id
    },
    {
      title: 'Deadpool & Wolverine (IMAX 3D)',
      type: 'movie',
      description: 'Marvel Studios ultimate team-up as the Merc with a Mouth joins forces with Wolverine in full 3D.',
      poster_url: '/event_pics/movie_3.png',
      venue: pvrDelhi,
      dateOffset: 5, // Aug 28
      time: '19:45',
      price: 480.00,
      cat: reclinerCat.id
    },
    {
      title: 'Pushpa 2: The Rule (Dolby Atmos)',
      type: 'movie',
      description: 'Allu Arjun returns as Pushpa Raj in the grand action finale dominating the red sandalwood empire.',
      poster_url: '/event_pics/movie_4.png',
      venue: pvrDelhi,
      dateOffset: 7, // Aug 30
      time: '20:30',
      price: 450.00,
      cat: reclinerCat.id
    },
    {
      title: 'Gladiator II (IMAX 70mm)',
      type: 'movie',
      description: 'Ridley Scott returns to the Colosseum in an epic sequel depicting power, revenge, and Roman glory.',
      poster_url: '/event_pics/movie_5.png',
      venue: pvrDelhi,
      dateOffset: 9, // Sep 1
      time: '17:30',
      price: 550.00,
      cat: reclinerCat.id
    },

    // 😂 COMEDY
    {
      title: 'Zakir Khan: Tathastu & Unfiltered Live',
      type: 'comedy',
      description: 'India’s Sakht Launda Zakir Khan brings his brand new hour of relatable storytelling and razor-sharp punchlines.',
      poster_url: '/event_pics/comedy_1.png',
      venue: habitatBlr,
      dateOffset: 2, // Aug 25
      time: '20:00',
      price: 799.00,
      cat: generalCat.id
    },
    {
      title: 'Anubhav Singh Bassi: Bas Kar Bassi',
      type: 'comedy',
      description: 'Bassi shares hilarious hostel memories, college nostalgia, and real-life misadventures live in Bengaluru.',
      poster_url: '/event_pics/comedy_2.png',
      venue: habitatBlr,
      dateOffset: 4, // Aug 27
      time: '19:30',
      price: 699.00,
      cat: generalCat.id
    },
    {
      title: 'Samay Raina: Unfiltered Standup Tour',
      type: 'comedy',
      description: 'The king of dark humor and crowd work Samay Raina performs his raw, unscripted live comedy show.',
      poster_url: '/event_pics/comedy_3.png',
      venue: habitatBlr,
      dateOffset: 6, // Aug 29
      time: '21:00',
      price: 899.00,
      cat: generalCat.id
    },
    {
      title: 'Harsh Gujral: Jo Bolta Hai Wohi Hota Hai',
      type: 'comedy',
      description: 'Harsh Gujral brings his quick-witted North Indian observational comedy and interactive crowd roasting.',
      poster_url: '/event_pics/comedy_4.png',
      venue: habitatBlr,
      dateOffset: 8, // Aug 31
      time: '18:30',
      price: 599.00,
      cat: generalCat.id
    },
    {
      title: 'Biswa Kalyan Rath: Live Standup Special',
      type: 'comedy',
      description: 'Biswa Mast Aadmi delivers hilarious analytical breakdowns of everyday Indian life and human behavior.',
      poster_url: '/event_pics/comedy_5.png',
      venue: habitatBlr,
      dateOffset: 10, // Sep 2
      time: '20:30',
      price: 749.00,
      cat: generalCat.id
    },

    // ⚽ SPORTS
    {
      title: 'India vs England T20 International Series',
      type: 'sports',
      description: 'High-voltage T20 international cricket clash under stadium lights at Wankhede Stadium, Mumbai.',
      poster_url: '/event_pics/sports_1.png',
      venue: wankhedeMumbai,
      dateOffset: 3, // Aug 26
      time: '19:00',
      price: 1800.00,
      cat: lowerTierCat.id
    },
    {
      title: 'IPL Night: Mumbai Indians vs Chennai Super Kings',
      type: 'sports',
      description: 'The blockbuster El Clásico of Indian cricket! Rohit Sharma vs MS Dhoni in a roaring stadium thriller.',
      poster_url: '/event_pics/sports_2.png',
      venue: wankhedeMumbai,
      dateOffset: 5, // Aug 28
      time: '19:30',
      price: 2500.00,
      cat: lowerTierCat.id
    },
    {
      title: 'ISL Final: Mohun Bagan vs Mumbai City FC',
      type: 'sports',
      description: 'The pinnacle of Indian football! Two powerhouse football clubs battle for 90 minutes for the ISL Trophy.',
      poster_url: '/event_pics/sports_3.png',
      venue: balewadiPune,
      dateOffset: 7, // Aug 30
      time: '19:30',
      price: 999.00,
      cat: upperDeckCat.id
    },
    {
      title: 'Pro Kabaddi League Championship Final',
      type: 'sports',
      description: 'High-intensity raids, tackles, and non-stop kabaddi adrenaline live inside the Gachibowli Arena.',
      poster_url: '/event_pics/sports_4.png',
      venue: gachibowliHyd,
      dateOffset: 9, // Sep 1
      time: '20:00',
      price: 750.00,
      cat: vipPitCat.id
    },
    {
      title: 'Formula 1 Indian Night Grand Prix 2026',
      type: 'sports',
      description: 'The ultimate motorsport spectacle! 200mph night circuit racing under towering stadium illuminations.',
      poster_url: '/event_pics/sports_5.png',
      venue: noidaStadium,
      dateOffset: 11, // Sep 3
      time: '20:00',
      price: 4500.00,
      cat: lowerTierCat.id
    }
  ];

  // Base date anchored strictly after Aug 24, 2026 (Aug 23 base + offsets)
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

    // Show date strictly after Aug 24, 2026
    const showDate = new Date(baseDate);
    showDate.setDate(baseDate.getDate() + item.dateOffset);

    const show = await prisma.show.create({
      data: {
        event_id: event.id,
        venue_id: item.venue.id,
        date: showDate,
        time: item.time
      }
    });

    await prisma.showCategoryPricing.create({
      data: {
        show_id: show.id,
        category_id: item.cat,
        price: item.price
      }
    });

    await prisma.seatStatus.createMany({
      data: venueSeats.map(seat => ({
        show_id: show.id,
        venue_seat_id: seat.id,
        status: 'available'
      }))
    });
  }

  console.log('Database successfully re-seeded with 20 real-world Indian events strictly after August 24, 2026!');
}

main()
  .catch(e => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
