-- Migration: add atomic increment function for total_participants
-- Fixes REG-022: read-modify-write race condition under concurrent registrations

CREATE OR REPLACE FUNCTION increment_event_participants(p_event_id text, p_count integer)
RETURNS void
LANGUAGE sql
AS $$
  UPDATE events
  SET total_participants = GREATEST(0, total_participants + p_count)
  WHERE event_id = p_event_id;
$$;
