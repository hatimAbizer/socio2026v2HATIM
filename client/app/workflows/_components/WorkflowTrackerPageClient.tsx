"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { ArrowLeft, RefreshCcw, Workflow } from "lucide-react";

import WorkflowMindmapCanvas from "@/app/workflows/_components/WorkflowMindmapCanvas";
import WorkflowSidebar from "@/app/workflows/_components/WorkflowSidebar";
import {
  WorkflowType,
  useWorkflowState,
} from "@/lib/hooks/useWorkflowState";

function normalizeText(value: unknown): string {
  return String(value || "").trim();
}

export default function WorkflowTrackerPageClient({
  workflowType,
  workflowId,
}: {
  workflowType: WorkflowType;
  workflowId: string;
}) {
  const {
    entityTitle,
    nodes,
    edges,
    timelineEvents,
    isLoading,
    error,
    refresh,
  } = useWorkflowState(workflowType, workflowId);

  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);

  useEffect(() => {
    if (!selectedNodeId) {
      return;
    }

    const stillExists = nodes.some((node) => node.id === selectedNodeId);
    if (!stillExists) {
      setSelectedNodeId(null);
    }
  }, [nodes, selectedNodeId]);

  const selectedNode = useMemo(
    () => nodes.find((node) => node.id === selectedNodeId)?.data || null,
    [nodes, selectedNodeId]
  );

  const typeLabel = workflowType === "event" ? "Event" : "Fest";
  const title = normalizeText(entityTitle) || `${typeLabel} Workflow`;

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 via-white to-slate-100">
      <div className="mx-auto w-full max-w-[1600px] px-4 pb-6 pt-5 sm:px-6">
        <header className="rounded-3xl border border-slate-200 bg-white/90 px-5 py-4 shadow-sm backdrop-blur sm:px-6">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <Link
                href="/manage"
                className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#154cb3] transition-colors hover:text-[#0f3f96]"
              >
                <ArrowLeft className="h-4 w-4" aria-hidden="true" />
                Back to Manage
              </Link>
              <div className="mt-2 flex items-center gap-2">
                <Workflow className="h-5 w-5 text-[#154cb3]" aria-hidden="true" />
                <h1 className="text-xl font-semibold text-slate-900 sm:text-2xl">{title}</h1>
              </div>
              <p className="mt-1 text-sm text-slate-600">
                {typeLabel} workflow tracker at /workflows/{workflowType}/{workflowId}
              </p>
            </div>

            <button
              type="button"
              onClick={() => void refresh()}
              className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 transition-colors hover:border-slate-300 hover:bg-slate-50"
            >
              <RefreshCcw className="h-4 w-4" aria-hidden="true" />
              Refresh
            </button>
          </div>
        </header>

        <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-[minmax(0,7fr)_minmax(320px,3fr)] lg:items-stretch">
          <div className="h-[56vh] min-h-[30rem] lg:h-[calc(100vh-12rem)]">
            <WorkflowMindmapCanvas
              nodes={nodes}
              edges={edges}
              isLoading={isLoading}
              error={error}
              onNodeSelect={setSelectedNodeId}
            />
          </div>

          <div className="h-[40vh] min-h-[26rem] lg:h-[calc(100vh-12rem)]">
            <WorkflowSidebar
              timelineEvents={timelineEvents}
              selectedNode={selectedNode}
              onBackToTimeline={() => setSelectedNodeId(null)}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
