import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { NextRequest, NextResponse } from "next/server";

import { hasAnyRoleCode } from "@/lib/roleDashboards";
import { getCurrentUserProfileWithRoleCodes } from "@/lib/serverRoleProfile";
import { fetchWorkflowApiWithFailover } from "@/lib/workflowApiClient";
import { triggerLogisticsApprovals, type LogisticsTriggerResult } from "@/app/manage/logistics/actions";

type OrganizerDecisionAction = "approve" | "reject" | "return";

function parseAction(value: unknown): OrganizerDecisionAction | null {
  if (value === "approve" || value === "reject" || value === "return") {
    return value;
  }
  return null;
}

function normalizeEmail(value: unknown): string {
  return String(value || "")
    .trim()
    .toLowerCase();
}

function jsonError(status: number, error: string) {
  return NextResponse.json({ error }, { status });
}

async function buildSupabaseServerClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    return null;
  }

  const cookieStore = await cookies();
  return createServerClient(supabaseUrl, supabaseAnonKey, {
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
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ eventId: string }> }
) {
  try {
    const { eventId } = await params;

    if (!eventId || eventId.trim().length === 0) {
      return jsonError(400, "Missing event id.");
    }

    const supabase = await buildSupabaseServerClient();
    if (!supabase) {
      return jsonError(500, "Supabase is not configured on this deployment.");
    }

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return jsonError(401, "Authentication required.");
    }

    const userProfile = await getCurrentUserProfileWithRoleCodes(supabase, {
      id: user.id,
      email: user.email,
    });

    if (!userProfile) {
      return jsonError(403, "Unable to resolve user profile.");
    }

    const isMasterAdmin = Boolean(userProfile.is_masteradmin);
    const isOrganizerTeacher =
      hasAnyRoleCode(userProfile as Record<string, unknown>, ["ORGANIZER"]) ||
      Boolean(userProfile.is_organiser);

    if (!isMasterAdmin && !isOrganizerTeacher) {
      return jsonError(403, "Only Organizer Teachers can take this action.");
    }

    // Verify this user is the organizer of the event's parent fest
    const { data: eventRow, error: eventError } = await supabase
      .from("events")
      .select("event_id, fest_id, workflow_status")
      .eq("event_id", eventId.trim())
      .maybeSingle();

    if (eventError) {
      return jsonError(500, `Failed to fetch event: ${eventError.message}`);
    }

    if (!eventRow) {
      return jsonError(404, "Event not found.");
    }

    const festId = String(eventRow.fest_id || "").trim();
    if (!festId) {
      return jsonError(400, "Event is not associated with a fest.");
    }

    const { data: festRow, error: festError } = await supabase
      .from("fests")
      .select("fest_id, created_by, contact_email")
      .eq("fest_id", festId)
      .maybeSingle();

    if (festError) {
      return jsonError(500, `Failed to fetch parent fest: ${festError.message}`);
    }

    if (!festRow) {
      return jsonError(404, "Parent fest not found.");
    }

    const requesterEmail = normalizeEmail(user.email);
    const festCreatedBy = normalizeEmail(festRow.created_by);
    const festContactEmail = normalizeEmail(festRow.contact_email);

    const isParentOrganizer =
      requesterEmail === festCreatedBy ||
      requesterEmail === festContactEmail;

    if (!isMasterAdmin && !isParentOrganizer) {
      return jsonError(403, "Only the parent fest organizer can take this action.");
    }

    const body = await request.json().catch(() => null);
    const action = parseAction(body?.action);
    const note = typeof body?.note === "string" ? body.note.trim() : "";

    if (!action) {
      return jsonError(400, "Invalid action. Expected approve, reject, or return.");
    }

    if ((action === "reject" || action === "return") && note.length < 10) {
      return jsonError(400, "A note of at least 10 characters is required.");
    }

    // Map frontend action to backend action
    const backendAction =
      action === "approve"
        ? "approved"
        : action === "return"
          ? "returned_for_revision"
          : "rejected";

    const {
      data: { session },
      error: sessionError,
    } = await supabase.auth.getSession();

    if (sessionError || !session?.access_token) {
      return jsonError(401, "Authentication session is unavailable. Please sign in again.");
    }

    let upstreamResponse: Response;
    try {
      const result = await fetchWorkflowApiWithFailover(
        `/api/events/${encodeURIComponent(eventId.trim())}/organiser-action`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({ action: backendAction, notes: note }),
        },
        20000
      );
      upstreamResponse = result.response;
    } catch (error: any) {
      if (error?.name === "AbortError") {
        return jsonError(504, "Approval service timeout. Please try again.");
      }
      return jsonError(502, "Unable to reach approval service. Please try again.");
    }

    let upstreamPayload: any = null;
    let upstreamText: string | null = null;

    try {
      upstreamPayload = await upstreamResponse.json();
    } catch {
      upstreamText = await upstreamResponse.text().catch(() => null);
    }

    if (!upstreamResponse.ok) {
      const upstreamError =
        upstreamPayload?.error ||
        upstreamPayload?.message ||
        upstreamText ||
        "Unable to update organizer decision.";
      return jsonError(upstreamResponse.status, upstreamError);
    }

    // On approval, trigger logistics approvals so service dashboards show this event.
    let logisticsTriggerResult: LogisticsTriggerResult = {
      ok: false,
      message: "Skipped (non-approve action).",
      eventId: eventId.trim(),
      generatedLevels: [],
      skippedLevels: [],
    };
    if (action === "approve") {
      try {
        logisticsTriggerResult = await triggerLogisticsApprovals(eventId.trim());
      } catch (_err) {
        // Non-fatal — log only, don't fail the response.
        logisticsTriggerResult = {
          ok: false,
          message: _err instanceof Error ? _err.message : "Logistics trigger failed.",
          eventId: eventId.trim(),
          generatedLevels: [],
          skippedLevels: [],
        };
      }

      revalidatePath("/manage/organizer");
      revalidatePath("/manage/it");
      revalidatePath("/manage/venue");
      revalidatePath("/manage/catering");
      revalidatePath("/manage/stalls");
    }

    return NextResponse.json({
      success: true,
      message:
        action === "approve"
          ? "Event approved successfully."
          : action === "return"
            ? "Event returned for revision."
            : "Event rejected.",
      data: upstreamPayload,
      logistics: logisticsTriggerResult,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unexpected server error.";
    return jsonError(500, message);
  }
}
