# 🚨 URGENT: Add Archive Columns to Events Table

The archive feature code is complete, but the database columns are missing. This file tells you exactly how to add them.

## How to Fix (2 minutes max)

### Option 1: Full Schema (Recommended) ✅

If you haven't set up the full database schema yet, use this complete file:
- **File**: [COMPLETE_SCHEMA_WITH_ARCHIVE.sql](COMPLETE_SCHEMA_WITH_ARCHIVE.sql)
- This includes ALL tables with the archive columns already integrated

### Option 2: Quick Add Just Archive Columns

### Step 1: Go to Supabase SQL Editor
Open this link in your browser:
```
https://app.supabase.com/project/wvebxdbvoinylwecmisv/sql/new
```

### Step 2: Copy This SQL

```sql
-- Add archive tracking fields for events
ALTER TABLE public.events
  ADD COLUMN IF NOT EXISTS is_archived BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS archived_at TIMESTAMPTZ NULL,
  ADD COLUMN IF NOT EXISTS archived_by TEXT NULL;

CREATE INDEX IF NOT EXISTS idx_events_is_archived ON public.events (is_archived);
CREATE INDEX IF NOT EXISTS idx_events_archived_at ON public.events (archived_at DESC);
```

### Step 3: Paste & Run
1. Paste the SQL above into the SQL Editor
2. Click the **Run** button (⏵ in top right, or Ctrl+Enter)
3. Wait for the green ✅ checkmark
4. Done!

## What This Does ✅

Adds 3 new columns to `events` table:
- `is_archived` (boolean) - marks event as archived
- `archived_at` (timestamp) - when it was archived
- `archived_by` (text) - who archived it

Plus 2 indexes for performance.

## After You Add The Columns

The archive feature will work immediately:
- Admins/organizers can click "Archive" button on events
- Archived events won't show to normal users
- Archived events show "ARCHIVED" badge to admins only

## Verify It Worked

Run this query in Supabase SQL Editor:

```sql
SELECT column_name, data_type FROM information_schema.columns 
WHERE table_name = 'events' AND column_name IN ('is_archived', 'archived_at', 'archived_by')
ORDER BY ordinal_position;
```

Should return 3 rows with the new columns.

---

**Questions?** Check that:
- You're in the right Supabase project (wvebxdbvoinylwecmisv)
- You copied all 3 SQL statements (2 ALTER TABLE columns + 2 CREATE INDEX)
- You hit Run (not just Ctrl+S)
