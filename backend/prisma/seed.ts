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
  console.log('Seeding database with 20 events...');

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
  let vipCategory = await prisma.seatCategory.findFirst({ where: { name: 'VIP' } });
  if (!vipCategory) {
    vipCategory = await prisma.seatCategory.create({ data: { name: 'VIP' } });
  }

  let regularCategory = await prisma.seatCategory.findFirst({ where: { name: 'Regular' } });
  if (!regularCategory) {
    regularCategory = await prisma.seatCategory.create({ data: { name: 'Regular' } });
  }

  // Create venue
  const venue = await prisma.venue.create({
    data: { name: 'Seatzy Grand Arena', address: '123 Neo Blvd', created_by: admin.id }
  });

  // Create venue seats (4 rows, 10 seats each)
  const seatsData = [];
  const rows = ['A', 'B', 'C', 'D'];
  for (let r = 0; r < rows.length; r++) {
    for (let i = 1; i <= 10; i++) {
      seatsData.push({ 
        venue_id: venue.id, 
        row_label: rows[r], 
        seat_number: i, 
        category_id: r < 2 ? vipCategory.id : regularCategory.id 
      });
    }
  }
  await prisma.venueSeat.createMany({ data: seatsData });

  // 20 Unique Events
  const eventData = [
    // MOVIES
    {
      title: 'Neon Chronicles',
      type: 'movie',
      description: 'A cyberpunk neo-noir film set in a dystopian future where human memories are traded as currency.',
      poster_url: '/images/movie_1_1787259781700.png'
    },
    {
      title: 'The Last Voyage',
      type: 'movie',
      description: 'A sci-fi epic following a lone starship searching for a new habitable world.',
      poster_url: '/images/movie_2_1787259806699.png'
    },
    {
      title: 'Midnight Paradox',
      type: 'movie',
      description: 'A gripping mystery thriller that twists the fabric of time.',
      poster_url: 'https://images.unsplash.com/photo-1536440136628-849c177e76a1?q=80&w=2025&auto=format&fit=crop'
    },
    {
      title: 'Echoes of Eternity',
      type: 'movie',
      description: 'A sweeping fantasy epic detailing the fall of an ancient magical empire.',
      poster_url: '/images/movie_4_1787259842743.png'
    },
    {
      title: 'Velocity Shift',
      type: 'movie',
      description: 'High octane racing action across neon-lit city streets.',
      poster_url: '/images/movie_5_1787259860945.png'
    },

    // CONCERTS
    {
      title: 'Electric Symphony',
      type: 'concert',
      description: 'A massive EDM festival featuring cutting-edge laser shows and massive drops.',
      poster_url: '/images/concert_1_1787259877711.png'
    },
    {
      title: 'Echoes of the Underground',
      type: 'concert',
      description: 'An intimate indie rock gig showcasing the best upcoming bands.',
      poster_url: '/images/concert_2_1787259889930.png'
    },
    {
      title: 'Jazz Under the Stars',
      type: 'concert',
      description: 'Smooth and elegant jazz performance under an open sky.',
      poster_url: '/images/concert_3_1787259917113.png'
    },
    {
      title: 'Bass Drop Riot',
      type: 'concert',
      description: 'Heavy dubstep and bass music that will shake the floor.',
      poster_url: 'https://images.unsplash.com/photo-1470229722913-7c090be5c524?q=80&w=2070&auto=format&fit=crop'
    },
    {
      title: 'The Golden Era Tour',
      type: 'concert',
      description: 'A tribute to the greatest classic rock anthems of the 70s and 80s.',
      poster_url: '/images/concert_5_1787259941929.png'
    },

    // COMEDY
    {
      title: 'Laugh Riot: Unfiltered',
      type: 'comedy',
      description: 'No holds barred standup comedy from the best rising stars.',
      poster_url: '/images/comedy_1_1787259957907.png'
    },
    {
      title: 'The Daily Roast',
      type: 'comedy',
      description: 'A brutal and hilarious roast battle between top comedians.',
      poster_url: '/images/comedy_2_1787259970477.png'
    },
    {
      title: 'Chuckles & Cheers',
      type: 'comedy',
      description: 'A family-friendly improv show filled with unexpected turns.',
      poster_url: '/images/comedy_3_1787259983214.png'
    },
    {
      title: 'Stand-Up Showdown',
      type: 'comedy',
      description: 'Comedians face off to win the ultimate title in a boxing-ring style stage.',
      poster_url: 'https://images.unsplash.com/photo-1527224857830-43a7ae858368?q=80&w=2069&auto=format&fit=crop'
    },
    {
      title: 'Midnight Giggles',
      type: 'comedy',
      description: 'A late-night special featuring dark humor and satire.',
      poster_url: 'https://images.unsplash.com/photo-1585699324551-f6c309eedeca?q=80&w=2070&auto=format&fit=crop'
    },

    // SPORTS
    {
      title: 'Apex Fight Night',
      type: 'sports',
      description: 'The premier MMA championship event of the year.',
      poster_url: 'https://images.unsplash.com/photo-1544365558-35aa4afcf11f?q=80&w=2036&auto=format&fit=crop'
    },
    {
      title: 'The Grand Slam Finale',
      type: 'sports',
      description: 'World-class tennis finals on clay courts.',
      poster_url: 'https://images.unsplash.com/photo-1595435934249-5df7ed86e1c0?q=80&w=2074&auto=format&fit=crop'
    },
    {
      title: 'Hoops & Dreams',
      type: 'sports',
      description: 'The ultimate city-wide basketball championship.',
      poster_url: 'https://images.unsplash.com/photo-1546519638-68e109498ffc?q=80&w=2090&auto=format&fit=crop'
    },
    {
      title: 'Velocity Racing Cup',
      type: 'sports',
      description: 'High-speed formula racing on a challenging street circuit.',
      poster_url: 'https://images.unsplash.com/photo-1532906806733-1456d9539d0d?q=80&w=2070&auto=format&fit=crop'
    },
    {
      title: 'Gridiron Clash',
      type: 'sports',
      description: 'Two massive rival football teams face off in the stadium.',
      poster_url: 'https://images.unsplash.com/photo-1566577739112-5180d4bf9390?q=80&w=1926&auto=format&fit=crop'
    }
  ];

  for (let i = 0; i < eventData.length; i++) {
    const ev = eventData[i];
    const event = await prisma.event.create({
      data: {
        organiser_id: organiser.id,
        title: ev.title,
        type: ev.type as any, // bypassing strict typescript enum check here
        description: ev.description,
        poster_url: ev.poster_url
      }
    });

    // Create 3 random shows for each event
    for (let s = 1; s <= 3; s++) {
      const showDate = new Date();
      // Random day between today and 60 days from now
      showDate.setDate(showDate.getDate() + Math.floor(Math.random() * 60) + 1); 
      
      const hours = ['18:00', '19:30', '20:00', '21:00', '22:00'];
      const randomTime = hours[Math.floor(Math.random() * hours.length)];

      const show = await prisma.show.create({
        data: { event_id: event.id, venue_id: venue.id, date: showDate, time: randomTime }
      });

      await prisma.showCategoryPricing.createMany({
        data: [
          { show_id: show.id, category_id: vipCategory.id, price: 100.00 + Math.floor(Math.random() * 50) },
          { show_id: show.id, category_id: regularCategory.id, price: 40.00 + Math.floor(Math.random() * 20) }
        ]
      });

      const venueSeats = await prisma.venueSeat.findMany({ where: { venue_id: venue.id } });
      await prisma.seatStatus.createMany({
        data: venueSeats.map(seat => ({
          show_id: show.id,
          venue_seat_id: seat.id,
          status: 'available'
        }))
      });
    }
  }

  console.log('Database seeded with 20 events successfully!');
}

main()
  .catch(e => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
