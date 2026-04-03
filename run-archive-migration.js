const { Pool } = require('pg');
const fs = require('fs');

const pool = new Pool({
  connectionString: 'postgresql://postgres.wvebxdbvoinylwecmisv:Apex@nFi3e123@aws-0-us-east-1.pooler.supabase.com:6543/postgres',
  ssl: { rejectUnauthorized: false }
});

async function runMigration() {
  const client = await pool.connect();
  try {
    console.log('Connecting to Supabase...');
    
    const sql = `
ALTER TABLE public.events
  ADD COLUMN IF NOT EXISTS is_archived BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS archived_at TIMESTAMPTZ NULL,
  ADD COLUMN IF NOT EXISTS archived_by TEXT NULL;

CREATE INDEX IF NOT EXISTS idx_events_is_archived ON public.events (is_archived);
CREATE INDEX IF NOT EXISTS idx_events_archived_at ON public.events (archived_at DESC);
    `;

    console.log('Running migration: Adding archive columns...');
    await client.query(sql);
    console.log('✓ Migration completed successfully!');
    console.log('✓ Added columns: is_archived, archived_at, archived_by');
    console.log('✓ Created indexes for performance');
  } catch (err) {
    console.error('ERROR:', err.message);
    console.error('Stack:', err.stack);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

runMigration();
