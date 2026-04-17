"use client";

import { useCallback, useEffect, useState } from "react";

export type PersistedDecision<A extends string> = {
  requestId: string;
  eventName: string;
  entityType: string;
  action: A;
  decidedAt: string;
};

const RETENTION_MS = 30 * 24 * 60 * 60 * 1000;

export function usePersistedDecisions<A extends string>(storageKey: string) {
  const [decisions, setDecisions] = useState<Record<string, PersistedDecision<A>>>({});

  useEffect(() => {
    try {
      const raw = localStorage.getItem(storageKey);
      if (!raw) return;
      const parsed = JSON.parse(raw) as Record<string, PersistedDecision<A>>;
      const cutoff = Date.now() - RETENTION_MS;
      const fresh: Record<string, PersistedDecision<A>> = {};
      for (const [id, v] of Object.entries(parsed)) {
        if (new Date(v.decidedAt).getTime() > cutoff) {
          fresh[id] = v;
        }
      }
      setDecisions(fresh);
    } catch {
      // ignore parse or storage errors
    }
  }, [storageKey]);

  const saveDecision = useCallback(
    (decision: PersistedDecision<A>) => {
      setDecisions((prev) => {
        const next = { ...prev, [decision.requestId]: decision };
        try {
          localStorage.setItem(storageKey, JSON.stringify(next));
        } catch {
          // ignore storage errors
        }
        return next;
      });
    },
    [storageKey]
  );

  return { decisions, saveDecision };
}

export function actionBadgeProps(action: string): { className: string; label: string } {
  if (action === "approve") return { className: "bg-emerald-100 text-emerald-800", label: "Approved" };
  if (action === "return") return { className: "bg-amber-100 text-amber-800", label: "Sent Back for Revision" };
  if (action === "reject" || action === "decline") return { className: "bg-red-100 text-red-800", label: "Declined" };
  return { className: "bg-slate-100 text-slate-700", label: action };
}

export function SpinnerIcon({ className = "h-3.5 w-3.5" }: { className?: string }) {
  return (
    <svg className={`${className} animate-spin`} fill="none" viewBox="0 0 24 24">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path
        className="opacity-75"
        fill="currentColor"
        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
      />
    </svg>
  );
}
