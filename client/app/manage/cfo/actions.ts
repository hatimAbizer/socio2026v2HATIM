"use server";

import { createServerClient } from "@supabase/ssr";
import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";

import { hasAnyRoleCode } from "@/lib/roleDashboards";
import { getCurrentUserProfileWithRoleCodes } from "@/lib/serverRoleProfile";

export interface CfoActionResult {
  ok: boolean;
  message: string;
  nextRequestId?: string | null;
  eventId?: string | null;
  alreadyProcessed?: boolean;
}

function normalizeText(value: unknown): string {
  return String(value || "").trim();
}

function fail(message: string): CfoActionResult {
  return { ok: false, message };
}

async function createSupabaseServerClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error("Supabase environment variables are missing.");
  }

  const cookieStore = await cookies();
  return createServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll() {
        // Server actions should not mutate cookies directly.
      },
    },
  });
}

async function resolveCfoSession() {
  const supabase = await createSupabaseServerClient();

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    return {
      ok: false as const,
      error: "Authentication required.",
      supabase,
      user: null,
      profile: null,
    };
  }

  const profile = await getCurrentUserProfileWithRoleCodes(supabase, {
    id: user.id,
    email: user.email,
  });

  if (!profile) {
    return {
      ok: false as const,
      error: "Unable to resolve user profile.",
      supabase,
      user,
      profile: null,
    };
  }

  const profileRecord = profile as Record<string, unknown>;
  const isMasterAdmin = Boolean(profileRecord.is_masteradmin);
  const isCfo = hasAnyRoleCode(profileRecord, ["CFO"]) || Boolean(profileRecord.is_cfo);

  if (!isMasterAdmin && !isCfo) {
    return {
      ok: false as const,
      error: "Only CFO or Master Admin users can perform this action.",
      supabase,
      user,
      profile,
    };
  }

  return {
    ok: true as const,
    error: null,
    supabase,
    user,
    profile,
  };
}

export async function processCfoApprovalAction(input: {
  requestId: string;
  note?: string;
}): Promise<CfoActionResult> {
  try {
    const requestId = normalizeText(input.requestId);
    const note = normalizeText(input.note);

    if (!requestId) {
      return fail("Approval request id is required.");
    }

    const authContext = await resolveCfoSession();
    if (!authContext.ok) {
      return fail(authContext.error);
    }

    const { supabase } = authContext;

    const { data: approvalRow, error: approvalError } = await supabase
      .from("approval_requests")
      .select("id,request_id,event_id,entity_ref,status")
      .eq("id", requestId)
      .maybeSingle();

    if (approvalError) {
      return fail(`Failed to load approval request: ${approvalError.message}`);
    }

    if (!approvalRow) {
      return fail("Approval request not found.");
    }

    const requestStatus = normalizeText(approvalRow.status).toLowerCase();
    if (!requestStatus || requestStatus === "approved" || requestStatus === "rejected") {
      return fail("This approval request is no longer pending.");
    }

    const approvalRequestDbId = normalizeText(approvalRow.id);
    const requestIdentifier = normalizeText(approvalRow.request_id);

    if (!approvalRequestDbId || !requestIdentifier) {
      return fail("Approval request is missing workflow identifiers.");
    }

    const { data: pendingStepRow, error: pendingStepError } = await supabase
      .from("approval_steps")
      .select("step_code,status")
      .eq("approval_request_id", approvalRequestDbId)
      .eq("role_code", "CFO")
      .eq("status", "PENDING")
      .order("sequence_order", { ascending: true })
      .limit(1)
      .maybeSingle();

    if (pendingStepError) {
      return fail(`Failed to load pending CFO step: ${pendingStepError.message}`);
    }

    if (!pendingStepRow) {
      return fail("No pending CFO step exists for this request.");
    }

    const stepCode = normalizeText((pendingStepRow as Record<string, unknown>).step_code);
    if (!stepCode) {
      return fail("Approval request is missing step identifiers.");
    }

    const {
      data: { session },
      error: sessionError,
    } = await supabase.auth.getSession();

    if (sessionError || !session?.access_token) {
      return fail("Authentication session is unavailable. Please sign in again.");
    }

    const apiBaseUrl = String(process.env.NEXT_PUBLIC_API_URL || "").replace(/\/api\/?$/, "");
    if (!apiBaseUrl) {
      return fail("NEXT_PUBLIC_API_URL is not configured for workflow decisions.");
    }

    const upstreamResponse = await fetch(
      `${apiBaseUrl}/api/approvals/requests/${encodeURIComponent(requestIdentifier)}/steps/${encodeURIComponent(stepCode)}/decision`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          decision: "APPROVED",
          comment: note || null,
        }),
        cache: "no-store",
      }
    );

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
        "Unable to update approval decision.";
      return fail(upstreamError);
    }

    const payload = (upstreamPayload || {}) as Record<string, unknown>;

    revalidatePath("/manage/cfo");
    revalidatePath("/manage/finance");

    return {
      ok: true,
      message: normalizeText(payload.message) || "CFO approval recorded successfully.",
      nextRequestId: normalizeText(payload.l4_request_id) || null,
      eventId: normalizeText(approvalRow.event_id || approvalRow.entity_ref) || null,
      alreadyProcessed: Boolean(payload.already_processed),
    };
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unexpected error while processing CFO approval.";
    return fail(message);
  }
}
