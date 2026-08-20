import { PrismaClient } from '@prisma/client';
import { Pool } from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';

// Using pg driver adapter for Prisma 7
const connectionString = process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/seatzy?schema=public';
const pool = new Pool({ connectionString });
const adapter = new PrismaPg(pool);

const prisma = new PrismaClient({ adapter });

export default prisma;
