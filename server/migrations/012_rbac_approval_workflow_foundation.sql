-- Migration: 012_rbac_approval_workflow_foundation
-- Introduces normalized RBAC and approval workflow foundation tables.

CREATE TABLE IF NOT EXISTS public.role_catalog (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  role_code text NOT NULL UNIQUE,
  role_name text NOT NULL,
  description text,
  is_service_role boolean NOT NULL DEFAULT false,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.role_capabilities (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  role_code text NOT NULL REFERENCES public.role_catalog(role_code) ON DELETE CASCADE,
  capability text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(role_code, capability)
);

CREATE TABLE IF NOT EXISTS public.user_role_assignments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  role_code text NOT NULL REFERENCES public.role_catalog(role_code) ON DELETE CASCADE,
  campus_scope text,
  department_scope text,
  valid_from timestamptz NOT NULL DEFAULT now(),
  valid_until timestamptz,
  is_active boolean NOT NULL DEFAULT true,
  assigned_by text,
  assigned_reason text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS user_role_assignments_user_id_idx
  ON public.user_role_assignments(user_id);

CREATE INDEX IF NOT EXISTS user_role_assignments_role_code_idx
  ON public.user_role_assignments(role_code);

CREATE INDEX IF NOT EXISTS user_role_assignments_scope_idx
  ON public.user_role_assignments(campus_scope, department_scope);

CREATE TABLE IF NOT EXISTS public.approval_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id text NOT NULL UNIQUE,
  entity_type text NOT NULL,
  entity_ref text NOT NULL,
  parent_fest_ref text,
  requested_by_user_id uuid REFERENCES public.users(id) ON DELETE SET NULL,
  requested_by_email text,
  organizing_dept text,
  campus_hosted_at text,
  is_budget_related boolean NOT NULL DEFAULT false,
  status text NOT NULL DEFAULT 'UNDER_REVIEW',
  submitted_at timestamptz NOT NULL DEFAULT now(),
  decided_at timestamptz,
  latest_comment text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS approval_requests_entity_idx
  ON public.approval_requests(entity_type, entity_ref);

CREATE UNIQUE INDEX IF NOT EXISTS approval_requests_single_active_idx
  ON public.approval_requests(entity_type, entity_ref)
  WHERE status IN ('DRAFT', 'UNDER_REVIEW');

CREATE TABLE IF NOT EXISTS public.approval_steps (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  approval_request_id uuid NOT NULL REFERENCES public.approval_requests(id) ON DELETE CASCADE,
  step_code text NOT NULL,
  role_code text NOT NULL REFERENCES public.role_catalog(role_code) ON DELETE RESTRICT,
  step_group int NOT NULL DEFAULT 1,
  sequence_order int NOT NULL DEFAULT 1,
  required_count int NOT NULL DEFAULT 1,
  status text NOT NULL DEFAULT 'PENDING',
  decided_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(approval_request_id, step_code)
);

CREATE INDEX IF NOT EXISTS approval_steps_queue_idx
  ON public.approval_steps(role_code, status, sequence_order, step_group);

CREATE TABLE IF NOT EXISTS public.approval_decisions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  approval_request_id uuid NOT NULL REFERENCES public.approval_requests(id) ON DELETE CASCADE,
  approval_step_id uuid NOT NULL REFERENCES public.approval_steps(id) ON DELETE CASCADE,
  decided_by_user_id uuid REFERENCES public.users(id) ON DELETE SET NULL,
  decided_by_email text,
  role_code text NOT NULL REFERENCES public.role_catalog(role_code) ON DELETE RESTRICT,
  decision text NOT NULL,
  comment text,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(approval_step_id, decided_by_user_id)
);

CREATE INDEX IF NOT EXISTS approval_decisions_request_idx
  ON public.approval_decisions(approval_request_id);

CREATE TABLE IF NOT EXISTS public.service_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  service_request_id text NOT NULL UNIQUE,
  event_id text NOT NULL REFERENCES public.events(event_id) ON DELETE CASCADE,
  approval_request_id uuid REFERENCES public.approval_requests(id) ON DELETE SET NULL,
  service_role_code text NOT NULL REFERENCES public.role_catalog(role_code) ON DELETE RESTRICT,
  requested_by_user_id uuid REFERENCES public.users(id) ON DELETE SET NULL,
  requested_by_email text,
  status text NOT NULL DEFAULT 'PENDING',
  details jsonb NOT NULL DEFAULT '{}'::jsonb,
  decided_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS service_requests_single_active_idx
  ON public.service_requests(event_id, service_role_code)
  WHERE status = 'PENDING';

CREATE INDEX IF NOT EXISTS service_requests_queue_idx
  ON public.service_requests(service_role_code, status, created_at);

CREATE TABLE IF NOT EXISTS public.service_decisions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  service_request_id uuid NOT NULL REFERENCES public.service_requests(id) ON DELETE CASCADE,
  decided_by_user_id uuid REFERENCES public.users(id) ON DELETE SET NULL,
  decided_by_email text,
  role_code text NOT NULL REFERENCES public.role_catalog(role_code) ON DELETE RESTRICT,
  decision text NOT NULL,
  comment text,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(service_request_id, decided_by_user_id)
);

ALTER TABLE IF EXISTS public.events
  ADD COLUMN IF NOT EXISTS approval_state text NOT NULL DEFAULT 'APPROVED',
  ADD COLUMN IF NOT EXISTS activation_state text NOT NULL DEFAULT 'ACTIVE',
  ADD COLUMN IF NOT EXISTS approval_request_id uuid REFERENCES public.approval_requests(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS is_budget_related boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS service_approval_state text NOT NULL DEFAULT 'APPROVED',
  ADD COLUMN IF NOT EXISTS approved_at timestamptz,
  ADD COLUMN IF NOT EXISTS approved_by text,
  ADD COLUMN IF NOT EXISTS rejected_at timestamptz,
  ADD COLUMN IF NOT EXISTS rejected_by text,
  ADD COLUMN IF NOT EXISTS rejection_reason text;

DO $$
DECLARE
  fest_table text;
BEGIN
  FOREACH fest_table IN ARRAY ARRAY['fests', 'fest']
  LOOP
    IF to_regclass(format('public.%I', fest_table)) IS NOT NULL THEN
      EXECUTE format(
        'ALTER TABLE public.%I
          ADD COLUMN IF NOT EXISTS approval_state text NOT NULL DEFAULT ''APPROVED'',
          ADD COLUMN IF NOT EXISTS activation_state text NOT NULL DEFAULT ''ACTIVE'',
          ADD COLUMN IF NOT EXISTS approval_request_id uuid REFERENCES public.approval_requests(id) ON DELETE SET NULL,
          ADD COLUMN IF NOT EXISTS is_budget_related boolean NOT NULL DEFAULT false,
          ADD COLUMN IF NOT EXISTS approved_at timestamptz,
          ADD COLUMN IF NOT EXISTS approved_by text,
          ADD COLUMN IF NOT EXISTS rejected_at timestamptz,
          ADD COLUMN IF NOT EXISTS rejected_by text,
          ADD COLUMN IF NOT EXISTS rejection_reason text;',
        fest_table
      );

      EXECUTE format(
        'UPDATE public.%I
         SET approval_state = ''APPROVED'',
             activation_state = ''ACTIVE'',
             approved_at = COALESCE(approved_at, now())
         WHERE approval_request_id IS NULL
           AND (approval_state IS DISTINCT FROM ''APPROVED''
                OR activation_state IS DISTINCT FROM ''ACTIVE''
                OR approved_at IS NULL);',
        fest_table
      );
    END IF;
  END LOOP;
END $$;

UPDATE public.events
SET approval_state = 'APPROVED',
    activation_state = 'ACTIVE',
    service_approval_state = 'APPROVED',
    approved_at = COALESCE(approved_at, now())
WHERE approval_request_id IS NULL
  AND (
    approval_state IS DISTINCT FROM 'APPROVED'
    OR activation_state IS DISTINCT FROM 'ACTIVE'
    OR service_approval_state IS DISTINCT FROM 'APPROVED'
    OR approved_at IS NULL
  );

INSERT INTO public.role_catalog (role_code, role_name, description, is_service_role, is_active)
VALUES
  ('MASTER_ADMIN', 'Master Admin', 'Global system visibility and edit access. Cannot approve on behalf of approval roles.', false, true),
  ('SUPPORT', 'Support', 'Operational support role retained for compatibility.', false, true),
  ('HOD', 'Head of Department', 'First-level approver for fests and standalone events.', false, true),
  ('DEAN', 'Dean', 'First-level parallel approver with HOD.', false, true),
  ('CFO', 'CFO', 'Second-level approver for budget-related requests.', false, true),
  ('ACCOUNTS', 'Accounts', 'Second-level parallel approver with CFO for budget-related requests.', false, true),
  ('ORGANIZER_TEACHER', 'Organizer Teacher', 'Can create fests and approve student-submitted events under approved fests.', false, true),
  ('ORGANIZER_STUDENT', 'Organizer Student', 'Can create/edit events only under approved fests.', false, true),
  ('ORGANIZER_VOLUNTEER', 'Organizer Volunteer', 'Placeholder dashboard role (read-only until scope is finalized).', false, true),
  ('SERVICE_IT', 'IT Services', 'Service-approval role with its own dashboard queue.', true, true),
  ('SERVICE_VENUE', 'Venue Services', 'Service-approval role with its own dashboard queue.', true, true),
  ('SERVICE_CATERING', 'Catering', 'Service-approval role with its own dashboard queue.', true, true),
  ('SERVICE_STALLS', 'Stalls', 'Service-approval role with its own dashboard queue.', true, true),
  ('SERVICE_SECURITY', 'Security', 'Service-approval role with its own dashboard queue.', true, true)
ON CONFLICT (role_code)
DO UPDATE SET
  role_name = EXCLUDED.role_name,
  description = EXCLUDED.description,
  is_service_role = EXCLUDED.is_service_role,
  is_active = true,
  updated_at = now();

INSERT INTO public.role_capabilities (role_code, capability)
VALUES
  ('MASTER_ADMIN', 'platform:view_all'),
  ('MASTER_ADMIN', 'platform:edit_all'),
  ('MASTER_ADMIN', 'users:manage_roles'),
  ('MASTER_ADMIN', 'dashboards:view_all'),
  ('HOD', 'approval:decision_stage_one'),
  ('DEAN', 'approval:decision_stage_one'),
  ('CFO', 'approval:decision_budget_stage'),
  ('ACCOUNTS', 'approval:decision_budget_stage'),
  ('ORGANIZER_TEACHER', 'fest:create'),
  ('ORGANIZER_TEACHER', 'approval:decision_fest_child_event'),
  ('ORGANIZER_TEACHER', 'dashboard:organizer_teacher'),
  ('ORGANIZER_STUDENT', 'event:create_under_approved_fest'),
  ('ORGANIZER_STUDENT', 'event:edit_under_approved_fest'),
  ('ORGANIZER_STUDENT', 'dashboard:organizer_student'),
  ('ORGANIZER_VOLUNTEER', 'dashboard:organizer_volunteer'),
  ('SERVICE_IT', 'service:queue_own'),
  ('SERVICE_IT', 'service:decision_own'),
  ('SERVICE_VENUE', 'service:queue_own'),
  ('SERVICE_VENUE', 'service:decision_own'),
  ('SERVICE_CATERING', 'service:queue_own'),
  ('SERVICE_CATERING', 'service:decision_own'),
  ('SERVICE_STALLS', 'service:queue_own'),
  ('SERVICE_STALLS', 'service:decision_own'),
  ('SERVICE_SECURITY', 'service:queue_own'),
  ('SERVICE_SECURITY', 'service:decision_own')
ON CONFLICT (role_code, capability) DO NOTHING;

INSERT INTO public.user_role_assignments (
  user_id,
  role_code,
  valid_from,
  valid_until,
  assigned_by,
  assigned_reason,
  is_active
)
SELECT
  u.id,
  'MASTER_ADMIN',
  now(),
  u.masteradmin_expires_at,
  'system:migration_012',
  'Backfilled from users.is_masteradmin',
  true
FROM public.users u
WHERE u.is_masteradmin = true
  AND (u.masteradmin_expires_at IS NULL OR u.masteradmin_expires_at > now())
  AND NOT EXISTS (
    SELECT 1
    FROM public.user_role_assignments ura
    WHERE ura.user_id = u.id
      AND ura.role_code = 'MASTER_ADMIN'
      AND ura.is_active = true
      AND (ura.valid_until IS NULL OR ura.valid_until > now())
  );

INSERT INTO public.user_role_assignments (
  user_id,
  role_code,
  valid_from,
  valid_until,
  assigned_by,
  assigned_reason,
  is_active
)
SELECT
  u.id,
  'ORGANIZER_TEACHER',
  now(),
  u.organiser_expires_at,
  'system:migration_012',
  'Backfilled from users.is_organiser',
  true
FROM public.users u
WHERE u.is_organiser = true
  AND (u.organiser_expires_at IS NULL OR u.organiser_expires_at > now())
  AND NOT EXISTS (
    SELECT 1
    FROM public.user_role_assignments ura
    WHERE ura.user_id = u.id
      AND ura.role_code = 'ORGANIZER_TEACHER'
      AND ura.is_active = true
      AND (ura.valid_until IS NULL OR ura.valid_until > now())
  );

INSERT INTO public.user_role_assignments (
  user_id,
  role_code,
  valid_from,
  valid_until,
  assigned_by,
  assigned_reason,
  is_active
)
SELECT
  u.id,
  'SUPPORT',
  now(),
  u.support_expires_at,
  'system:migration_012',
  'Backfilled from users.is_support',
  true
FROM public.users u
WHERE u.is_support = true
  AND (u.support_expires_at IS NULL OR u.support_expires_at > now())
  AND NOT EXISTS (
    SELECT 1
    FROM public.user_role_assignments ura
    WHERE ura.user_id = u.id
      AND ura.role_code = 'SUPPORT'
      AND ura.is_active = true
      AND (ura.valid_until IS NULL OR ura.valid_until > now())
  );
