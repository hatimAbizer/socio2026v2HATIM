"use client";

import { DeanApprovalAction, DeanApprovalQueueItem } from "../types";
import { SpinnerIcon } from "../../_shared/usePersistedDecisions";

interface DeanApprovalTableProps {
  rows: DeanApprovalQueueItem[];
  completedActions: Record<string, DeanApprovalAction>;
  activeRequestId: string | null;
  onApprove: (requestId: string) => void;
  onReturn: (requestId: string) => void;
  onDecline: (requestId: string) => void;
}

const currencyFormatter = new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
  maximumFractionDigits: 0,
});

function formatDateLabel(dateValue: string | null): string {
  if (!dateValue) {
    return "TBD";
  }

  const parsedDate = new Date(dateValue);
  if (Number.isNaN(parsedDate.getTime())) {
    return "TBD";
  }

  return parsedDate.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

export default function DeanApprovalTable({
  rows,
  completedActions,
  activeRequestId,
  onApprove,
  onReturn,
  onDecline,
}: DeanApprovalTableProps) {
  if (rows.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-slate-300 bg-white p-10 text-center">
        <h3 className="text-lg font-semibold text-slate-800">No pending L2 approvals</h3>
        <p className="mt-2 text-sm text-slate-600">
          No pending dean-level requests in this department filter.
        </p>
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-slate-200">
          <thead className="bg-slate-50">
            <tr>
              <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-600">
                Event Name
              </th>
              <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-600">
                Department Name
              </th>
              <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-600">
                Total Budget
              </th>
              <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-600">
                Coordinator Name
              </th>
              <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-600">
                Date
              </th>
              <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-600">
                Actions
              </th>
            </tr>
          </thead>

          <tbody className="divide-y divide-slate-100">
            {rows.map((row) => {
              const isWorking = activeRequestId === row.id;
              const completedAction = completedActions[row.id] || null;
              const isCompleted = Boolean(completedAction);

              return (
                <tr key={row.id} className="hover:bg-slate-50/70">
                  <td className="px-5 py-4 align-top">
                    <span className="inline-flex rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-700">
                      {row.entityType}
                    </span>
                    <p className="text-sm font-semibold text-slate-900">{row.eventName}</p>
                    <p className="mt-1 text-xs text-slate-500">ID: {row.eventId}</p>
                  </td>
                  <td className="px-5 py-4 align-top">
                    <span className="inline-flex rounded-full bg-amber-100 px-3 py-1 text-xs font-bold uppercase tracking-[0.1em] text-amber-900">
                      {row.departmentName}
                    </span>
                  </td>
                  <td className="px-5 py-4 align-top text-sm font-medium text-slate-800">
                    {currencyFormatter.format(row.totalBudget || 0)}
                  </td>
                  <td className="px-5 py-4 align-top text-sm text-slate-700">{row.coordinatorName}</td>
                  <td className="px-5 py-4 align-top text-sm text-slate-700">{formatDateLabel(row.eventDate)}</td>
                  <td className="px-5 py-4 align-top">
                    {isCompleted ? (
                      <span
                        className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${
                          completedAction === "approve"
                            ? "bg-emerald-100 text-emerald-800"
                            : completedAction === "decline"
                            ? "bg-red-100 text-red-800"
                            : "bg-amber-100 text-amber-800"
                        }`}
                      >
                        {completedAction === "approve"
                          ? "Approved"
                          : completedAction === "decline"
                          ? "Declined"
                          : "Sent Back for Revision"}
                      </span>
                    ) : (
                      <div className="flex flex-wrap gap-2">
                        <button
                          type="button"
                          onClick={() => onApprove(row.id)}
                          disabled={isWorking}
                          className="inline-flex items-center gap-1.5 rounded-md bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-emerald-500 disabled:cursor-not-allowed disabled:opacity-60"
                        >
                          {isWorking ? <SpinnerIcon /> : null}
                          Approve
                        </button>
                        <button
                          type="button"
                          onClick={() => onReturn(row.id)}
                          disabled={isWorking}
                          className="inline-flex items-center gap-1.5 rounded-md bg-amber-500 px-3 py-1.5 text-xs font-semibold text-slate-900 transition hover:bg-amber-400 disabled:cursor-not-allowed disabled:opacity-60"
                        >
                          {isWorking ? <SpinnerIcon /> : null}
                          Send Back
                        </button>
                        <button
                          type="button"
                          onClick={() => onDecline(row.id)}
                          disabled={isWorking}
                          className="inline-flex items-center gap-1.5 rounded-md bg-red-600 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-red-500 disabled:cursor-not-allowed disabled:opacity-60"
                        >
                          {isWorking ? <SpinnerIcon /> : null}
                          Decline
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
    </div>
  );
}
