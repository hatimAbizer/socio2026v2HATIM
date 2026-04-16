"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import type { OrganizerDashboardMetrics, OrganizerPendingEventItem } from "../_lib/organizerDashboardData";

type OrganizerAction = "approve" | "reject" | "return";

type ModalState = {
  eventId: string;
  eventTitle: string;
  action: OrganizerAction;
  note: string;
  errorMessage: string | null;
};

type CompletedActionMap = Record<string, OrganizerAction>;

const ROW_COMPLETION_DISPLAY_MS = 1600;
const NOTE_MIN_CHARS = 10;

async function fetchWithTimeout(
  url: string,
  options: RequestInit,
  timeoutMs: number
): Promise<Response> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { ...options, signal: controller.signal });
  } finally {
    clearTimeout(timeoutId);
  }
}

function formatRelativeDate(iso: string | null): string {
  if (!iso) return "Unknown date";
  const ms = Date.now() - new Date(iso).getTime();
  const days = Math.floor(ms / 86400000);
  if (days === 0) return "Today";
  if (days === 1) return "Yesterday";
  if (days < 30) return `${days} days ago`;
  return new Date(iso).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
}

export default function OrganizerApprovalClient({
  initialQueue,
  initialMetrics,
}: {
  initialQueue: OrganizerPendingEventItem[];
  initialMetrics: OrganizerDashboardMetrics;
}) {
  const router = useRouter();
  const [queue, setQueue] = useState<OrganizerPendingEventItem[]>(initialQueue);
  const [metrics, setMetrics] = useState<OrganizerDashboardMetrics>(initialMetrics);
  const [completedActions, setCompletedActions] = useState<CompletedActionMap>({});
  const [activeEventId, setActiveEventId] = useState<string | null>(null);
  const [modalState, setModalState] = useState<ModalState | null>(null);
  const completionTimers = useRef<Record<string, ReturnType<typeof setTimeout>>>({});

  useEffect(() => {
    return () => {
      Object.values(completionTimers.current).forEach((id) => clearTimeout(id));
      completionTimers.current = {};
    };
  }, []);

  const applySuccessfulAction = (eventId: string, action: OrganizerAction) => {
    setCompletedActions((prev) => ({ ...prev, [eventId]: action }));
    setMetrics((prev) => ({ ...prev, pendingApprovals: Math.max(prev.pendingApprovals - 1, 0) }));

    const existing = completionTimers.current[eventId];
    if (existing) clearTimeout(existing);

    completionTimers.current[eventId] = setTimeout(() => {
      setQueue((prev) => prev.filter((row) => row.eventId !== eventId));
      setCompletedActions((prev) => {
        const next = { ...prev };
        delete next[eventId];
        return next;
      });
      delete completionTimers.current[eventId];
    }, ROW_COMPLETION_DISPLAY_MS);
  };

  const submitAction = async (eventId: string, action: OrganizerAction, note?: string) => {
    setActiveEventId(eventId);

    try {
      const response = await fetchWithTimeout(
        `/api/manage/organizer/events/${encodeURIComponent(eventId)}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action, note: note?.trim() || null }),
        },
        20000
      );

      const payload = await response.json().catch(() => null);
      if (!response.ok) {
        throw new Error(payload?.error || "Unable to update approval.");
      }

      applySuccessfulAction(eventId, action);
      setModalState(null);
      toast.success(
        action === "approve"
          ? "Event approved and forwarded to service teams."
          : action === "return"
            ? "Event returned for revision."
            : "Event rejected."
      );
      router.refresh();
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unexpected error. Please try again.";
      if (modalState?.eventId === eventId) {
        setModalState((prev) => (prev ? { ...prev, errorMessage: message } : null));
      } else {
        toast.error(message);
      }
    } finally {
      setActiveEventId(null);
    }
  };

  const openModal = (item: OrganizerPendingEventItem, action: OrganizerAction) => {
    setModalState({ eventId: item.eventId, eventTitle: item.eventTitle, action, note: "", errorMessage: null });
  };

  const handleModalSubmit = () => {
    if (!modalState) return;
    const { eventId, action, note } = modalState;
    if (action !== "approve" && note.trim().length < NOTE_MIN_CHARS) {
      setModalState((prev) => (prev ? { ...prev, errorMessage: `Note must be at least ${NOTE_MIN_CHARS} characters.` } : null));
      return;
    }
    submitAction(eventId, action, note);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Organizer Approval Dashboard</h1>
          <p className="mt-1 text-sm text-gray-500">
            Review and approve events created by your fest subheads.
          </p>
        </div>
        <div className="rounded-xl border border-blue-100 bg-blue-50 px-4 py-2 text-center">
          <div className="text-2xl font-bold text-blue-700">{metrics.pendingApprovals}</div>
          <div className="text-xs text-blue-500">Pending Approvals</div>
        </div>
      </div>

      {/* Queue */}
      {queue.length === 0 ? (
        <div className="rounded-xl border border-gray-100 bg-gray-50 p-10 text-center">
          <p className="text-lg font-medium text-gray-500">No events pending your approval</p>
          <p className="mt-1 text-sm text-gray-400">
            Subheads assigned to your fests will appear here when they submit events.
          </p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
          <table className="min-w-full divide-y divide-gray-100">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Event</th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Fest</th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Submitted By</th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Submitted</th>
                <th className="px-6 py-3 text-right text-xs font-medium uppercase tracking-wider text-gray-500">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {queue.map((item) => {
                const isDone = Boolean(completedActions[item.eventId]);
                const isActive = activeEventId === item.eventId;
                return (
                  <tr
                    key={item.eventId}
                    className={`transition-colors duration-200 ${isDone ? "bg-green-50 opacity-60" : "bg-white hover:bg-gray-50"}`}
                  >
                    <td className="px-6 py-4">
                      <span className="font-medium text-gray-900">{item.eventTitle}</span>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600">{item.festTitle}</td>
                    <td className="px-6 py-4 text-sm text-gray-600">{item.submittedByEmail}</td>
                    <td className="px-6 py-4 text-sm text-gray-500">{formatRelativeDate(item.submittedAt)}</td>
                    <td className="px-6 py-4 text-right">
                      {isDone ? (
                        <span className="text-sm font-medium text-green-600">
                          {completedActions[item.eventId] === "approve" ? "Approved" : completedActions[item.eventId] === "return" ? "Returned" : "Rejected"}
                        </span>
                      ) : (
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => submitAction(item.eventId, "approve")}
                            disabled={isActive}
                            className="rounded-lg bg-green-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-green-700 disabled:cursor-not-allowed disabled:opacity-50"
                          >
                            {isActive ? "..." : "Approve"}
                          </button>
                          <button
                            onClick={() => openModal(item, "return")}
                            disabled={isActive}
                            className="rounded-lg border border-amber-300 bg-amber-50 px-3 py-1.5 text-xs font-semibold text-amber-700 hover:bg-amber-100 disabled:cursor-not-allowed disabled:opacity-50"
                          >
                            Return
                          </button>
                          <button
                            onClick={() => openModal(item, "reject")}
                            disabled={isActive}
                            className="rounded-lg border border-red-300 bg-red-50 px-3 py-1.5 text-xs font-semibold text-red-700 hover:bg-red-100 disabled:cursor-not-allowed disabled:opacity-50"
                          >
                            Reject
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Return/Reject Modal */}
      {modalState && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl">
            <h2 className="text-lg font-semibold text-gray-900">
              {modalState.action === "return" ? "Return for Revision" : "Reject Event"}
            </h2>
            <p className="mt-1 text-sm text-gray-500">
              {modalState.eventTitle}
            </p>
            <textarea
              className="mt-4 w-full rounded-lg border border-gray-300 p-3 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              rows={4}
              placeholder={`Provide a note (at least ${NOTE_MIN_CHARS} characters)...`}
              value={modalState.note}
              onChange={(e) => setModalState((prev) => (prev ? { ...prev, note: e.target.value, errorMessage: null } : null))}
            />
            {modalState.errorMessage && (
              <p className="mt-2 text-sm text-red-600">{modalState.errorMessage}</p>
            )}
            <div className="mt-4 flex justify-end gap-3">
              <button
                onClick={() => setModalState(null)}
                className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={handleModalSubmit}
                disabled={activeEventId === modalState.eventId}
                className={`rounded-lg px-4 py-2 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50 ${
                  modalState.action === "reject"
                    ? "bg-red-600 hover:bg-red-700"
                    : "bg-amber-600 hover:bg-amber-700"
                }`}
              >
                {activeEventId === modalState.eventId
                  ? "Submitting..."
                  : modalState.action === "return"
                    ? "Return for Revision"
                    : "Reject Event"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
