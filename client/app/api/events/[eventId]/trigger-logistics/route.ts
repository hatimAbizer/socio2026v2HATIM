import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { NextRequest, NextResponse } from "next/server";

import { triggerLogisticsApprovals } from "@/app/manage/logistics/actions";

function jsonError(status: number, error: string) {
  return NextResponse.json({ error }, { status });
}

/**
 * POST /api/events/[eventId]/trigger-logistics
 *
 * Called by the event creation page after a teacher successfully creates an
 * under-fest event that requests one or more services (IT/Venue/Catering/Stalls).
 * Creates L5_* approval_requests rows so service dashboards can see the event.
 *
 * Auth: Supabase session required. Only organizer teachers and master admins
 * can call this — enforced inside triggerLogisticsApprovals via canTriggerLogisticsGeneration.
 */
export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ eventId: string }> }
) {
  const { eventId } = await params;

  if (!eventId || eventId.trim().length === 0) {
    return jsonError(400, "Missing event id.");
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    return jsonError(500, "Supabase is not configured on this deployment.");
  }

  const cookieStore = await cookies();
  const supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet: { name: string; value: string; options?: any }[]) {
        cookiesToSet.forEach(({ name, value, options }) => {
          cookieStore.set(name, value, options);
        });
      },
    },
  });

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    return jsonError(401, "Authentication required.");
  }

  try {
    const result = await triggerLogisticsApprovals(eventId.trim());
    return NextResponse.json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Logistics trigger failed.";
    return jsonError(500, message);
  }
}
