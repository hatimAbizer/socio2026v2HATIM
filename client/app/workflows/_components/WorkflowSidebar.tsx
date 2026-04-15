"use client";

import {
  ArrowLeft,
  CalendarClock,
  ListOrdered,
  Mail,
  MessageSquareText,
  ShieldCheck,
  UserRound,
} from "lucide-react";

import {
  ApprovalStatusBadge,
  ApprovalStatusIcon,
} from "@/app/manage/_components/approvalWorkflowVisuals";
import type {
  WorkflowNodeData,
  WorkflowTimelineEvent,
} from "@/lib/hooks/useWorkflowState";

function normalizeText(value: unknown): string {
  return String(value || "").trim();
}

function sourceLabel(source: WorkflowTimelineEvent["source"]): string {
  if (source === "submission") {
    return "Submission";
  }

  if (source === "approval") {
    return "Approval";
  }

  if (source === "service") {
    return "Service";
  }

  return "Incident";
}

export default function WorkflowSidebar({
  timelineEvents,
  selectedNode,
  onBackToTimeline,
}: {
  timelineEvents: WorkflowTimelineEvent[];
  selectedNode: WorkflowNodeData | null;
  onBackToTimeline: () => void;
}) {
  if (selectedNode) {
    return (
      <aside className="h-full min-h-[26rem] overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-[0_20px_60px_-30px_rgba(15,23,42,0.35)]">
        <div className="flex h-full flex-col">
          <div className="border-b border-slate-200 px-5 py-4">
            <button
              type="button"
              onClick={onBackToTimeline}
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#154cb3] transition-colors hover:text-[#0f3f96]"
            >
              <ArrowLeft className="h-4 w-4" aria-hidden="true" />
              Back to Timeline
            </button>
            <h2 className="mt-3 text-lg font-semibold text-slate-900">{selectedNode.title}</h2>
            <p className="mt-1 text-sm text-slate-600">{selectedNode.description}</p>
          </div>

          <div className="flex-1 space-y-4 overflow-y-auto px-5 py-5">
            <section className="rounded-2xl border border-slate-200 bg-white p-4">
              <p className="text-[11px] font-semibold uppercase tracking-[0.11em] text-slate-500">Status</p>
              <div className="mt-2">
                <ApprovalStatusBadge status={selectedNode.status} />
              </div>
            </section>

            <section className="rounded-2xl border border-slate-200 bg-white p-4">
              <p className="text-[11px] font-semibold uppercase tracking-[0.11em] text-slate-500">Approver Profile</p>
              <div className="mt-3 space-y-2">
                <div className="flex items-center gap-2 text-sm text-slate-700">
                  <UserRound className="h-4 w-4 text-slate-500" aria-hidden="true" />
                  <span>{selectedNode.approverName || "Awaiting approver action"}</span>
                </div>
                <div className="flex items-center gap-2 text-sm text-slate-700">
                  <Mail className="h-4 w-4 text-slate-500" aria-hidden="true" />
                  <span>{selectedNode.approverEmail || "Email unavailable"}</span>
                </div>
                <div className="flex items-center gap-2 text-sm text-slate-700">
                  <ShieldCheck className="h-4 w-4 text-slate-500" aria-hidden="true" />
                  <span>{selectedNode.approverRole || selectedNode.roleCode}</span>
                </div>
              </div>
            </section>

            <section className="rounded-2xl border border-slate-200 bg-white p-4">
              <p className="text-[11px] font-semibold uppercase tracking-[0.11em] text-slate-500">Timestamp</p>
              <div className="mt-2 flex items-center gap-2 text-sm text-slate-700">
                <CalendarClock className="h-4 w-4 text-slate-500" aria-hidden="true" />
                <span>{selectedNode.timestamp || "No timestamp available yet"}</span>
              </div>
            </section>

            <section className="rounded-2xl border border-slate-200 bg-white p-4">
              <p className="text-[11px] font-semibold uppercase tracking-[0.11em] text-slate-500">Review Notes</p>
              {selectedNode.reviewNote ? (
                <div className="mt-2 rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-800">
                  <div className="mb-1 flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.08em] text-rose-700">
                    <MessageSquareText className="h-4 w-4" aria-hidden="true" />
                    Returned / Rejected Note
                  </div>
                  <p>{selectedNode.reviewNote}</p>
                </div>
              ) : (
                <p className="mt-2 text-sm text-slate-500">No review note required for this node status.</p>
              )}
            </section>
          </div>
        </div>
      </aside>
    );
  }

  return (
    <aside className="h-full min-h-[26rem] overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-[0_20px_60px_-30px_rgba(15,23,42,0.35)]">
      <div className="flex h-full flex-col">
        <div className="border-b border-slate-200 px-5 py-4">
          <div className="flex items-center gap-2">
            <ListOrdered className="h-4 w-4 text-[#154cb3]" aria-hidden="true" />
            <h2 className="text-lg font-semibold text-slate-900">Chronological Timeline</h2>
          </div>
          <p className="mt-1 text-sm text-slate-600">
            Every workflow action appears here in sequence.
          </p>
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-5">
          {timelineEvents.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-4 text-sm text-slate-500">
              No workflow actions have been recorded yet.
            </div>
          ) : (
            <ol className="relative space-y-4">
              {timelineEvents.map((item, index) => (
                <li key={item.id} className="relative pl-8">
                  {index !== timelineEvents.length - 1 ? (
                    <span className="absolute left-[11px] top-7 h-[calc(100%+0.75rem)] w-px bg-slate-200" aria-hidden="true" />
                  ) : null}
                  <span className="absolute left-0 top-1 inline-flex h-5 w-5 items-center justify-center rounded-full border border-slate-200 bg-white">
                    <ApprovalStatusIcon status={item.status} className="h-3.5 w-3.5" animatePending />
                  </span>

                  <div className="rounded-2xl border border-slate-200 bg-white px-3 py-3">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="text-sm font-semibold text-slate-900">{item.title}</p>
                      <span className="rounded-full border border-slate-200 bg-slate-50 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.08em] text-slate-600">
                        {sourceLabel(item.source)}
                      </span>
                    </div>
                    <p className="mt-1 text-xs text-slate-600">{item.subtitle}</p>
                    {normalizeText(item.note) ? (
                      <p className="mt-2 text-xs text-rose-700">{item.note}</p>
                    ) : null}
                    <p className="mt-2 text-[11px] text-slate-500">{item.timestamp || "Timestamp unavailable"}</p>
                  </div>
                </li>
              ))}
            </ol>
          )}
        </div>
      </div>
    </aside>
  );
}
