import { Pool } from 'pg';

export const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgresql://oficina:oficina123@localhost:5432/oficina',
});