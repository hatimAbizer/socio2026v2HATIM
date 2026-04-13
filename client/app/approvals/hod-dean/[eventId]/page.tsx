"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { createBrowserClient } from "@supabase/ssr";
import { toast } from "sonner";
import Link from "next/link";
import {
  ArrowLeft,
  CheckCircle,
  XCircle,
  Clock,
  Calendar,
  MapPin,
  Users,
  IndianRupee,
  AlertTriangle,
} from "lucide-react";
import { hasAnyRoleCode } from "@/lib/roleDashboards";

const API_URL = process.env.NEXT_PUBLIC_API_URL!.replace(/\/api\/?$/, "");

interface ApprovalStep {
  id: string;
  step_code?: string | null;
  role_code?: string | null;
  status?: string | null;
  sequence_order?: number | null;
  decided_at?: string | null;
  latest_decision?: { decision?: string; comment?: string; decided_by_email?: string } | null;
}

interface ApprovalRequest {
  id: string;
  request_id?: string | null;
  status?: string | null;
  submitted_at?: string | null;
  is_budget_related?: boolean | null;
  steps: ApprovalStep[];
}

interface EventDetail {
  event_id: string;
  title: string;
  description?: string;
  event_date?: string;
  venue?: string;
  organizing_dept?: string;
  organizer_email?: string;
  max_participants?: number;
  registration_fee?: number;
  workflow_status?: string;
  approval_state?: string;
  status?: string;
  lifecycle_status?: string;
  is_draft?: boolean;
  approval_request_id?: string;
}

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

function normalizeToken(v?: string | null) {
  return String(v || "").trim().toUpperCase();
}

function StatusPill({ status }: { status?: string | null }) {
  const token = normalizeToken(status);
  if (token === "PENDING") return (
    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold bg-amber-100 text-amber-800">
      <Clock className="w-3 h-3" /> Pending
    </span>
  );
  if (token === "APPROVED") return (
    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold bg-emerald-100 text-emerald-800">
      <CheckCircle className="w-3 h-3" /> Approved
    </span>
  );
  if (token === "REJECTED" || token === "SKIPPED") return (
    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold bg-red-100 text-red-800">
      <XCircle className="w-3 h-3" /> {token === "SKIPPED" ? "Skipped" : "Rejected"}
    </span>
  );
  return (
    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold bg-slate-100 text-slate-500">
      {token || "—"}
    </span>
  );
}

export default function HodDeanApprovalPage() {
  const { eventId } = useParams<{ eventId: string }>();
  const { userData, isMasterAdmin } = useAuth();
  const userRecord = (userData as Record<string, unknown> | null) ?? null;
  const isHod = Boolean(userData?.is_hod) || hasAnyRoleCode(userRecord, ["HOD"]);
  const isDean = Boolean((userData as any)?.is_dean) || hasAnyRoleCode(userRecord, ["DEAN"]);

  const [event, setEvent] = useState<EventDetail | null>(null);
  const [approvalTimeline, setApprovalTimeline] = useState<ApprovalRequest | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [authToken, setAuthToken] = useState<string | null>(null);
  const [note, setNote] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Load auth token
  useEffect(() => {
    const load = async () => {
      const supabase = createBrowserClient(SUPABASE_URL, SUPABASE_ANON_KEY);
      const { data: { session } } = await supabase.auth.getSession();
      setAuthToken(session?.access_token ?? null);
    };
    load();
  }, []);

  // Fetch event + approval timeline
  const fetchData = useCallback(async () => {
    if (!authToken || !eventId) return;
    setIsLoading(true);
    try {
      // Fetch event
      const evRes = await fetch(`${API_URL}/api/events/${eventId}`, {
        headers: { Authorization: `Bearer ${authToken}` },
        cache: "no-store",
      });
      if (!evRes.ok) throw new Error(`Event fetch failed (${evRes.status})`);
      const evData = await evRes.json();
      const ev: EventDetail = evData?.event ?? evData;
      setEvent(ev);

      // Fetch approval timeline if request id exists
      const requestId = ev.approval_request_id;
      if (requestId) {
        const supabase = createBrowserClient(SUPABASE_URL, SUPABASE_ANON_KEY);
        const { data: reqData } = await supabase
          .from("approval_requests")
          .select(`
            id, request_id, status, submitted_at, is_budget_related,
            approval_steps (
              id, step_code, role_code, status, sequence_order, decided_at,
              approval_step_decisions ( decision, comment, decided_by_email, created_at )
            )
          `)
          .eq("id", requestId)
          .maybeSingle();

        if (reqData) {
          const steps: ApprovalStep[] = ((reqData as any).approval_steps ?? []).map((s: any) => ({
            ...s,
            latest_decision: Array.isArray(s.approval_step_decisions) && s.approval_step_decisions.length > 0
              ? s.approval_step_decisions.sort((a: any, b: any) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())[0]
              : null,
          }));
          setApprovalTimeline({ ...reqData, steps } as ApprovalRequest);
        }
      }
    } catch (err: any) {
      toast.error(err.message ?? "Failed to load data.");
    } finally {
      setIsLoading(false);
    }
  }, [authToken, eventId]);

  useEffect(() => { fetchData(); }, [fetchData]);

  // Find the pending step for the current user's role
  const pendingStep = approvalTimeline?.steps.find((s) => {
    const roleCode = normalizeToken(s.role_code);
    const stepStatus = normalizeToken(s.status);
    if (stepStatus !== "PENDING") return false;
    if (isMasterAdmin) return true;
    if (isHod && roleCode === "HOD") return true;
    if (isDean && roleCode === "DEAN") return true;
    return false;
  }) ?? null;

  const handleDecision = async (decision: "APPROVED" | "REJECTED") => {
    if (!pendingStep || !approvalTimeline) {
      toast.error("No pending step found for your role.");
      return;
    }
    if (!authToken) { toast.error("Not authenticated."); return; }
    if (decision === "REJECTED" && note.trim().length < 20) {
      toast.error("Please provide a revision note of at least 20 characters.");
      return;
    }
    setIsSubmitting(true);
    try {
      const requestIdentifier = approvalTimeline.request_id;
      const stepCode = pendingStep.step_code;
      if (!requestIdentifier || !stepCode) throw new Error("Missing workflow identifiers.");

      const res = await fetch(
        `${API_URL}/api/approvals/requests/${encodeURIComponent(requestIdentifier)}/steps/${encodeURIComponent(stepCode)}/decision`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${authToken}`,
          },
          body: JSON.stringify({
            decision,
            comment: decision === "REJECTED" ? `RETURN_FOR_REVISION: ${note.trim()}` : null,
          }),
        }
      );
      const data = await res.json().catch(() => null);
      if (!res.ok) throw new Error(data?.error ?? "Decision submission failed.");

      toast.success(decision === "APPROVED" ? "✅ Event approved!" : "Event returned for revision.");
      setNote("");
      await fetchData();
    } catch (err: any) {
      toast.error(err.message ?? "Unable to submit decision.");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <main className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 rounded-full border-4 border-blue-600 border-t-transparent animate-spin" />
          <p className="text-slate-500 text-sm font-medium">Loading approval data…</p>
        </div>
      </main>
    );
  }

  if (!event) {
    return (
      <main className="min-h-screen bg-slate-50 flex items-center justify-center px-4">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-slate-800 mb-2">Event Not Found</h1>
          <p className="text-slate-500 mb-6">This event doesn&apos;t exist or you don&apos;t have access to it.</p>
          <Link href="/manage" className="text-blue-600 hover:underline text-sm font-semibold">← Back to Manage</Link>
        </div>
      </main>
    );
  }

  const canAct = Boolean(pendingStep) && (isMasterAdmin || isHod || isDean);
  const overallStatus = normalizeToken(approvalTimeline?.status);

  return (
    <main className="min-h-screen bg-slate-50">
      <div className="max-w-3xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-6">
          <Link href={isHod ? "/manage/hod" : isDean ? "/manage/dean" : "/manage"} className="inline-flex items-center gap-2 text-sm text-slate-500 hover:text-slate-800 transition-colors mb-4">
            <ArrowLeft className="w-4 h-4" /> Back to Dashboard
          </Link>
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-1">
                {isHod ? "HOD" : isDean ? "Dean" : "Admin"} Approval Review
              </p>
              <h1 className="text-2xl font-extrabold text-[#0f2557]">{event.title}</h1>
              <p className="text-sm text-slate-500 mt-0.5">{event.organizing_dept}</p>
            </div>
            <StatusPill status={overallStatus || event.workflow_status} />
          </div>
        </div>

        {/* Event Info Card */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 mb-6 space-y-4">
          <h2 className="text-sm font-bold text-slate-700 uppercase tracking-wide">Event Details</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm text-slate-600">
            {event.event_date && (
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4 text-slate-400 shrink-0" />
                <span>{new Date(event.event_date).toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" })}</span>
              </div>
            )}
            {event.venue && (
              <div className="flex items-center gap-2">
                <MapPin className="w-4 h-4 text-slate-400 shrink-0" />
                <span>{event.venue}</span>
              </div>
            )}
            {event.max_participants && (
              <div className="flex items-center gap-2">
                <Users className="w-4 h-4 text-slate-400 shrink-0" />
                <span>Max {event.max_participants} participants</span>
              </div>
            )}
            {event.registration_fee !== undefined && event.registration_fee !== null && (
              <div className="flex items-center gap-2">
                <IndianRupee className="w-4 h-4 text-slate-400 shrink-0" />
                <span>{event.registration_fee === 0 ? "Free" : `₹${event.registration_fee}`}</span>
              </div>
            )}
            {event.organizer_email && (
              <div className="flex items-center gap-2 sm:col-span-2">
                <span className="text-slate-400 font-medium">Submitted by:</span>
                <span className="font-semibold text-slate-700">{event.organizer_email}</span>
              </div>
            )}
          </div>
          {event.description && (
            <div>
              <p className="text-xs font-semibold text-slate-500 uppercase mb-1">Description</p>
              <p className="text-sm text-slate-700 leading-relaxed">{event.description}</p>
            </div>
          )}
        </div>

        {/* Approval Timeline Card */}
        {approvalTimeline && approvalTimeline.steps.length > 0 && (
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 mb-6">
            <h2 className="text-sm font-bold text-slate-700 uppercase tracking-wide mb-4">Approval Timeline</h2>
            <div className="space-y-3">
              {approvalTimeline.steps
                .sort((a, b) => (a.sequence_order ?? 0) - (b.sequence_order ?? 0))
                .map((step) => (
                  <div key={step.id} className="flex items-start gap-3 p-3 rounded-xl bg-slate-50 border border-slate-100">
                    <div className="mt-0.5">
                      <StatusPill status={step.status} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-slate-800">{normalizeToken(step.role_code)} Review</p>
                      {step.latest_decision?.decided_by_email && (
                        <p className="text-xs text-slate-500 mt-0.5">By {step.latest_decision.decided_by_email}</p>
                      )}
                      {step.latest_decision?.comment && (
                        <p className="text-xs text-slate-600 mt-1 italic">
                          {step.latest_decision.comment.replace(/^RETURN_FOR_REVISION:\s*/i, "")}
                        </p>
                      )}
                    </div>
                  </div>
                ))}
            </div>
          </div>
        )}

        {/* Decision Panel */}
        {canAct ? (
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-5">
            <h2 className="text-sm font-bold text-slate-700 uppercase tracking-wide">Your Decision</h2>
            <div className="rounded-xl border border-blue-100 bg-blue-50 px-4 py-3 text-sm text-blue-800">
              You are reviewing this as <strong>{normalizeToken(pendingStep?.role_code)}</strong>.
              Approving will advance it to the next step; returning it will notify the organiser.
            </div>

            <div>
              <label htmlFor="decision-note" className="block text-sm font-semibold text-slate-700 mb-1.5">
                Revision Notes <span className="text-slate-400 font-normal">(required when returning for revision)</span>
              </label>
              <textarea
                id="decision-note"
                rows={4}
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="Describe what needs to be revised…"
                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400 resize-none placeholder:text-slate-400"
              />
              {note.length > 0 && note.length < 20 && (
                <p className="mt-1 text-xs text-red-500">Note must be at least 20 characters ({note.length}/20)</p>
              )}
            </div>

            <div className="flex flex-col sm:flex-row gap-3">
              <button
                onClick={() => handleDecision("APPROVED")}
                disabled={isSubmitting}
                className="flex items-center justify-center gap-2 flex-1 px-5 py-3 bg-emerald-600 text-white font-semibold rounded-xl hover:bg-emerald-700 transition-colors disabled:opacity-50 text-sm shadow-sm"
              >
                {isSubmitting ? <div className="w-4 h-4 rounded-full border-2 border-white border-t-transparent animate-spin" /> : <CheckCircle className="w-4 h-4" />}
                {isSubmitting ? "Processing…" : "Approve Event"}
              </button>
              <button
                onClick={() => handleDecision("REJECTED")}
                disabled={isSubmitting || note.trim().length < 20}
                className="flex items-center justify-center gap-2 flex-1 px-5 py-3 bg-white text-red-600 border border-red-300 font-semibold rounded-xl hover:bg-red-50 transition-colors disabled:opacity-40 text-sm shadow-sm"
              >
                {isSubmitting ? <div className="w-4 h-4 rounded-full border-2 border-red-500 border-t-transparent animate-spin" /> : <XCircle className="w-4 h-4" />}
                {isSubmitting ? "Processing…" : "Return for Revision"}
              </button>
            </div>
          </div>
        ) : (
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 flex flex-col items-center text-center gap-3">
            {overallStatus === "APPROVED" ? (
              <><CheckCircle className="w-12 h-12 text-emerald-500" /><h2 className="text-lg font-bold text-slate-800">Fully Approved</h2><p className="text-sm text-slate-500">All approval steps have been cleared.</p></>
            ) : overallStatus === "REJECTED" ? (
              <><XCircle className="w-12 h-12 text-red-400" /><h2 className="text-lg font-bold text-slate-800">Returned for Revision</h2><p className="text-sm text-slate-500">This request was returned. Awaiting resubmission.</p></>
            ) : (
              <><AlertTriangle className="w-12 h-12 text-amber-400" /><h2 className="text-lg font-bold text-slate-800">No Action Required</h2><p className="text-sm text-slate-500">There is no pending step requiring your approval at this time.</p></>
            )}
            <Link href={isHod ? "/manage/hod" : isDean ? "/manage/dean" : "/manage"} className="mt-2 text-sm font-semibold text-blue-600 hover:underline">
              ← Back to Dashboard
            </Link>
          </div>
        )}
      </div>
    </main>
  );
}
