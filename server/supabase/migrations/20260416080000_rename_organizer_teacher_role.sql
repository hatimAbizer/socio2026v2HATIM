-- Migration: rename role code ORGANIZER_TEACHER → ORGANIZER
-- The _TEACHER suffix was never meaningful; this is simply the "Organizer" role
-- for teacher-level organizers who create fests and approve subhead events.

-- 1. Insert the new role code into role_catalog (in case it doesn't already exist)
INSERT INTO public.role_catalog (role_code, role_name, description, is_service_role, is_active)
VALUES (
  'ORGANIZER',
  'Organizer',
  'Can create fests and events, and approve student-submitted events under approved fests.',
  false,
  true
)
ON CONFLICT (role_code) DO NOTHING;

-- 2. Re-point any user_role_assignments rows from the old code to the new one
UPDATE public.user_role_assignments
SET role_code = 'ORGANIZER'
WHERE role_code = 'ORGANIZER_TEACHER';

-- 3. Update approval_steps: both role_code and step_code columns
UPDATE public.approval_steps
SET role_code = 'ORGANIZER'
WHERE role_code = 'ORGANIZER_TEACHER';

UPDATE public.approval_steps
SET step_code = 'ORGANIZER'
WHERE step_code = 'ORGANIZER_TEACHER';

-- 4. Update approval_decisions if they recorded the old code
UPDATE public.approval_decisions
SET role_code = 'ORGANIZER'
WHERE role_code = 'ORGANIZER_TEACHER';

-- 5. Remove the old role catalog entry
--    (done last so FK constraints are satisfied by the time we delete)
DELETE FROM public.role_catalog
WHERE role_code = 'ORGANIZER_TEACHER';
