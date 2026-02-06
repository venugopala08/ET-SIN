// FILE: lib/db.ts
import { Pool } from 'pg';

const db = new Pool({
  connectionString: process.env.DATABASE_URL,
  // Fix: Enable SSL for deployment (Vercel/Supabase), but keep it optional for localhost if needed
  ssl: process.env.NODE_ENV === 'production' 
    ? { rejectUnauthorized: false } 
    : undefined,
});

export default db;