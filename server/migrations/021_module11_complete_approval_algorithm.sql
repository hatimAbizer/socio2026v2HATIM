-- Migration: 021_module11_complete_approval_algorithm
-- Adds the complete approval algorithm implementation for Module 11

-- 1. Add approval workflow columns to fests table
ALTER TABLE public.fests
  ADD COLUMN IF NOT EXISTS workflow_status TEXT NOT NULL DEFAULT 'draft',
  -- values: draft | pending_hod | hod_approved | pending_dean | 
  --         dean_approved | pending_cfo | cfo_approved | 
  --         pending_accounts | fully_approved | live | 
  --         rejected | final_rejected
  ADD COLUMN IF NOT EXISTS workflow_version INTEGER NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS activated_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS activated_by TEXT;

-- 2. Add approval workflow columns to events table
ALTER TABLE public.events
  ADD COLUMN IF NOT EXISTS workflow_status TEXT NOT NULL DEFAULT 'draft',
  -- values: draft | auto_approved | pending_hod | hod_approved |
  --         pending_dean | dept_approved | pending_cfo | cfo_approved |
  --         pending_accounts | fully_approved | pending_organiser |
  --         organiser_approved | live | rejected | final_rejected
  ADD COLUMN IF NOT EXISTS event_context TEXT NOT NULL DEFAULT 'standalone',
  -- values: standalone | under_fest
  ADD COLUMN IF NOT EXISTS needs_hod_dean_approval BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS needs_budget_approval BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS workflow_version INTEGER NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS parent_fest_id TEXT REFERENCES public.fests(fest_id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS created_by_subhead BOOLEAN NOT NULL DEFAULT FALSE;

-- 3. Create approval_chain_log table (immutable audit trail)
CREATE TABLE IF NOT EXISTS public.approval_chain_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_type TEXT NOT NULL, -- 'fest' | 'event'
  entity_id TEXT NOT NULL,
  step TEXT NOT NULL,
  -- fest steps: hod_review | dean_review | cfo_review | accounts_review
  -- standalone steps: hod_dean_review | cfo_review | accounts_review
  -- under_fest steps: organiser_review
  action TEXT NOT NULL, -- 'approved' | 'rejected' | 'returned_for_revision' | 'resubmitted' | 'auto_approved'
  actor_email TEXT NOT NULL,
  actor_role TEXT NOT NULL,
  notes TEXT, -- mandatory on rejection/revision (min 20 chars)
  version INTEGER NOT NULL DEFAULT 1,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- approval_chain_log is append-only. Add a trigger to prevent updates/deletes.
CREATE OR REPLACE FUNCTION prevent_audit_log_mutation()
RETURNS TRIGGER AS $$
BEGIN
  RAISE EXCEPTION 'Audit log records are immutable. No updates or deletes allowed.';
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS lock_approval_chain_log ON public.approval_chain_log;
CREATE TRIGGER lock_approval_chain_log
  BEFORE UPDATE OR DELETE ON public.approval_chain_log
  FOR EACH ROW EXECUTE FUNCTION prevent_audit_log_mutation();

-- 4. Create fest_subheads table
CREATE TABLE IF NOT EXISTS public.fest_subheads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  fest_id TEXT NOT NULL REFERENCES public.fests(fest_id) ON DELETE CASCADE,
  user_email TEXT NOT NULL,
  added_by TEXT NOT NULL, -- email of fest organiser who added them
  added_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  UNIQUE(fest_id, user_email)
);

-- 5. Create service_requests table
-- (IT, Venue, AV, Catering, Security etc. all flow through this)
CREATE TABLE IF NOT EXISTS public.service_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_type TEXT NOT NULL, -- 'fest' | 'event'
  entity_id TEXT NOT NULL,
  service_type TEXT NOT NULL,
  -- values: it | venue | av | catering | security | housekeeping | 
  --         photography | decor | transport | stalls | other
  details JSONB NOT NULL DEFAULT '{}',
  -- for venue: { venue_id, date, slots[], headcount, setup_notes }
  -- for it: { projectors, pa_systems, laptops, bandwidth, notes }
  -- for catering: { headcount, veg_count, vendor, budget, advance_needed }
  -- for stalls: { count, layout_notes }
  assigned_incharge_email TEXT, -- auto-populated from service_incharge_config
  status TEXT NOT NULL DEFAULT 'pending',
  -- values: pending | approved | rejected | returned_for_revision
  requester_email TEXT NOT NULL,
  approval_notes TEXT,
  resubmission_count INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Backward compatibility: align legacy service_requests schema (if table already existed)
-- with Module 11 columns so index creation and new APIs work safely.
ALTER TABLE public.service_requests
  ADD COLUMN IF NOT EXISTS entity_type TEXT,
  ADD COLUMN IF NOT EXISTS entity_id TEXT,
  ADD COLUMN IF NOT EXISTS service_type TEXT,
  ADD COLUMN IF NOT EXISTS assigned_incharge_email TEXT,
  ADD COLUMN IF NOT EXISTS requester_email TEXT,
  ADD COLUMN IF NOT EXISTS approval_notes TEXT,
  ADD COLUMN IF NOT EXISTS resubmission_count INTEGER NOT NULL DEFAULT 0;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'service_requests'
      AND column_name = 'event_id'
  ) THEN
    UPDATE public.service_requests
    SET entity_type = COALESCE(entity_type, 'event'),
        entity_id = COALESCE(entity_id, event_id)
    WHERE entity_id IS NULL;
  END IF;

  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'service_requests'
      AND column_name = 'service_role_code'
  ) THEN
    UPDATE public.service_requests
    SET service_type = COALESCE(
      service_type,
      CASE
        WHEN upper(service_role_code) LIKE '%IT%' THEN 'it'
        WHEN upper(service_role_code) LIKE '%VENUE%' THEN 'venue'
        WHEN upper(service_role_code) LIKE '%CATER%' THEN 'catering'
        WHEN upper(service_role_code) LIKE '%STALL%' THEN 'stalls'
        ELSE 'other'
      END
    )
    WHERE service_type IS NULL;
  END IF;

  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'service_requests'
      AND column_name = 'requested_by_email'
  ) THEN
    UPDATE public.service_requests
    SET requester_email = COALESCE(requester_email, requested_by_email)
    WHERE requester_email IS NULL;
  END IF;

  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'service_requests'
      AND column_name = 'service_request_id'
  ) THEN
    UPDATE public.service_requests
    SET entity_id = COALESCE(entity_id, service_request_id)
    WHERE entity_id IS NULL;
  END IF;
END $$;

UPDATE public.service_requests
SET entity_type = COALESCE(entity_type, 'event'),
    entity_id = COALESCE(entity_id, id::text),
    service_type = COALESCE(NULLIF(service_type, ''), 'other'),
    requester_email = COALESCE(requester_email, 'unknown@christuniversity.in')
WHERE entity_type IS NULL
   OR entity_id IS NULL
   OR service_type IS NULL
   OR requester_email IS NULL;

ALTER TABLE public.service_requests
  ALTER COLUMN entity_type SET NOT NULL,
  ALTER COLUMN entity_id SET NOT NULL,
  ALTER COLUMN service_type SET NOT NULL,
  ALTER COLUMN requester_email SET NOT NULL,
  ALTER COLUMN resubmission_count SET DEFAULT 0;

-- 6. Create service_incharge_config table
-- Admin configures who handles which service per campus
CREATE TABLE IF NOT EXISTS public.service_incharge_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campus TEXT NOT NULL,
  service_type TEXT NOT NULL,
  incharge_email TEXT NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  UNIQUE(campus, service_type)
);

-- 7. Indexes
CREATE INDEX IF NOT EXISTS idx_acl_entity ON public.approval_chain_log(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_acl_actor ON public.approval_chain_log(actor_email);
CREATE INDEX IF NOT EXISTS idx_acl_created ON public.approval_chain_log(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_fests_workflow ON public.fests(workflow_status);
CREATE INDEX IF NOT EXISTS idx_events_workflow ON public.events(workflow_status);
CREATE INDEX IF NOT EXISTS idx_events_context ON public.events(event_context);
CREATE INDEX IF NOT EXISTS idx_events_parent_fest ON public.events(parent_fest_id);
CREATE INDEX IF NOT EXISTS idx_fest_subheads_fest ON public.fest_subheads(fest_id);
CREATE INDEX IF NOT EXISTS idx_fest_subheads_user ON public.fest_subheads(user_email);
CREATE INDEX IF NOT EXISTS idx_service_requests_entity ON public.service_requests(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_service_requests_incharge ON public.service_requests(assigned_incharge_email, status);
