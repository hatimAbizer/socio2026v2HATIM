import "server-only";

export interface OrganizerPendingEventItem {
  id: string;
  eventId: string;
  eventTitle: string;
  festTitle: string;
  festId: string;
  submittedByEmail: string;
  submittedAt: string | null;
}

export interface OrganizerDashboardMetrics {
  pendingApprovals: number;
}

export interface OrganizerDashboardData {
  queue: OrganizerPendingEventItem[];
  metrics: OrganizerDashboardMetrics;
}

function normalizeText(value: unknown): string {
  return String(value || "").trim();
}

function normalizeLower(value: unknown): string {
  return normalizeText(value).toLowerCase();
}

type EventRow = {
  event_id?: string | null;
  title?: string | null;
  workflow_status?: string | null;
  organizer_email?: string | null;
  fest_id?: string | null;
  created_at?: string | null;
  submitted_at?: string | null;
};

type FestRow = {
  fest_id?: string | null;
  fest_title?: string | null;
  created_by?: string | null;
  contact_email?: string | null;
};

/**
 * Fetches events pending organizer-teacher approval for the given user.
 * Queries events with workflow_status = 'PENDING_ORGANISER' where the parent
 * fest was created by (or has contact_email of) the current user.
 */
export async function fetchOrganizerDashboardData({
  supabase,
  userEmail,
}: {
  supabase: any;
  userEmail: string;
}): Promise<OrganizerDashboardData> {
  const normalizedEmail = normalizeLower(userEmail);

  if (!normalizedEmail) {
    return { queue: [], metrics: { pendingApprovals: 0 } };
  }

  // 1. Find fests owned by this organizer (created_by or contact_email)
  const { data: festsCreatedBy, error: festsCreatedByError } = await supabase
    .from("fests")
    .select("fest_id, fest_title, created_by, contact_email")
    .eq("created_by", normalizedEmail);

  const { data: festsByContact, error: festsByContactError } = await supabase
    .from("fests")
    .select("fest_id, fest_title, created_by, contact_email")
    .eq("contact_email", normalizedEmail);

  if (festsCreatedByError && festsByContactError) {
    throw new Error(`Failed to load organizer fests: ${festsCreatedByError.message}`);
  }

  const festRowsById = new Map<string, FestRow>();

  for (const row of (festsCreatedBy ?? []) as FestRow[]) {
    const festId = normalizeText(row.fest_id);
    if (festId) festRowsById.set(festId, row);
  }
  for (const row of (festsByContact ?? []) as FestRow[]) {
    const festId = normalizeText(row.fest_id);
    if (festId) festRowsById.set(festId, row);
  }

  if (festRowsById.size === 0) {
    return { queue: [], metrics: { pendingApprovals: 0 } };
  }

  const festIds = Array.from(festRowsById.keys());

  // 2. Fetch events pending organizer review under those fests
  const { data: pendingEventsData, error: pendingEventsError } = await supabase
    .from("events")
    .select("event_id, title, workflow_status, organizer_email, fest_id, created_at")
    .in("fest_id", festIds)
    .in("workflow_status", ["pending_organiser", "PENDING_ORGANISER"]);

  if (pendingEventsError) {
    throw new Error(`Failed to load pending events: ${pendingEventsError.message}`);
  }

  const pendingEvents = Array.isArray(pendingEventsData)
    ? (pendingEventsData as EventRow[])
    : [];

  const queue: OrganizerPendingEventItem[] = pendingEvents
    .map((eventRow) => {
      const eventId = normalizeText(eventRow.event_id);
      const festId = normalizeText(eventRow.fest_id);
      if (!eventId || !festId) return null;

      const festRow = festRowsById.get(festId);
      return {
        id: eventId,
        eventId,
        eventTitle: normalizeText(eventRow.title) || "Untitled Event",
        festTitle: normalizeText(festRow?.fest_title) || "Untitled Fest",
        festId,
        submittedByEmail: normalizeText(eventRow.organizer_email) || "Unknown",
        submittedAt: normalizeText(eventRow.created_at) || null,
      };
    })
    .filter((item): item is OrganizerPendingEventItem => item !== null)
    .sort((a, b) => {
      const aTime = a.submittedAt ? new Date(a.submittedAt).getTime() : 0;
      const bTime = b.submittedAt ? new Date(b.submittedAt).getTime() : 0;
      return aTime - bTime; // Oldest first
    });

  return {
    queue,
    metrics: { pendingApprovals: queue.length },
  };
}
