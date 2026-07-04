import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import  { Pool } from 'pg';

// Establish a single, shared native Node connection pool
const pool = new Pool({ 
  connectionString: process.env.DATABASE_URL 
});

// Wrap it inside Prisma 7's required Rust-free driver adapter layer
const adapter = new PrismaPg(pool);

// Instantiate it once globally with the explicit adapter
export const prisma = new PrismaClient({ adapter });
