const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = 'https://wvebxdbvoinylwecmisv.supabase.co';
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

if (!SERVICE_ROLE_KEY) {
  console.error('ERROR: SUPABASE_SERVICE_ROLE_KEY environment variable not set');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

async function addArchiveColumns() {
  try {
    console.log('Adding archive columns to events table...');

    // Execute the migration
    const { error } = await supabase.rpc('exec_sql', {
      sql: `
        ALTER TABLE public.events
          ADD COLUMN IF NOT EXISTS is_archived BOOLEAN NOT NULL DEFAULT FALSE,
          ADD COLUMN IF NOT EXISTS archived_at TIMESTAMPTZ NULL,
          ADD COLUMN IF NOT EXISTS archived_by TEXT NULL;

        CREATE INDEX IF NOT EXISTS idx_events_is_archived ON public.events (is_archived);
        CREATE INDEX IF NOT EXISTS idx_events_archived_at ON public.events (archived_at DESC);
      `
    });

    if (error) {
      console.error('Error adding columns:', error.message);
      process.exit(1);
    }

    console.log('✓ Archive columns added successfully!');
  } catch (err) {
    console.error('Error:', err.message);
    process.exit(1);
  }
}

addArchiveColumns();
