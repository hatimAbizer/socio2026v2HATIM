const https = require('https');

const SUPABASE_URL = 'https://wvebxdbvoinylwecmisv.supabase.co';
const SERVICE_ROLE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Ind2ZWJ4ZGJ2b2lueWx3ZWNtaXN2Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTcyMzAwNDcxMywiZXhwIjoxODgwNzcwNzEzfQ.MNnTG4CaLLQ8yPXFuNV4n3LMQT_5vfECaaMPHHVYZrI';

async function executeSQL(sql) {
  return new Promise((resolve, reject) => {
    const data = JSON.stringify({ sql });
    
    const options = {
      hostname: 'wvebxdbvoinylwecmisv.supabase.co',
      path: '/rest/v1/rpc/exec_sql',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': data.length,
        'Authorization': `Bearer ${SERVICE_ROLE_KEY}`,
        'apikey': SERVICE_ROLE_KEY
      }
    };

    const req = https.request(options, (res) => {
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => {
        try {
          if (res.statusCode === 200 || res.statusCode === 201) {
            resolve(body);
          } else {
            reject(new Error(`HTTP ${res.statusCode}: ${body}`));
          }
        } catch (e) {
          reject(e);
        }
      });
    });

    req.on('error', reject);
    req.write(data);
    req.end();
  });
}

async function addArchiveColumns() {
  try {
    console.log('Adding archive columns to events table via REST API...');
    
    const sql = `ALTER TABLE public.events
      ADD COLUMN IF NOT EXISTS is_archived BOOLEAN NOT NULL DEFAULT FALSE,
      ADD COLUMN IF NOT EXISTS archived_at TIMESTAMPTZ NULL,
      ADD COLUMN IF NOT EXISTS archived_by TEXT NULL;
    CREATE INDEX IF NOT EXISTS idx_events_is_archived ON public.events (is_archived);
    CREATE INDEX IF NOT EXISTS idx_events_archived_at ON public.events (archived_at DESC);`;
    
    const result = await executeSQL(sql);
    console.log('✓ Archive columns added successfully!');
    console.log('Response:', result);
    process.exit(0);
  } catch (err) {
    console.error('ERROR adding columns:', err.message);
    process.exit(1);
  }
}

addArchiveColumns();
