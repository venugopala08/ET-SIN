// FILE: lib/db.ts
import { Pool } from 'pg';

const isSupabase = process.env.DATABASE_URL?.includes('supabase.co');

const db = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: isSupabase 
    ? { rejectUnauthorized: false } // Force SSL for Supabase (Local & Prod)
    : undefined,                    // No SSL for local Postgres
});

export default db;