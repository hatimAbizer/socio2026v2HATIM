"use client";

import {
  Background,
  Controls,
  Edge,
  MiniMap,
  Node,
  NodeProps,
  ReactFlow,
} from "reactflow";

import "reactflow/dist/style.css";

import {
  ApprovalStatusIcon,
  getStatusVisualConfig,
} from "@/app/manage/_components/approvalWorkflowVisuals";
import type { WorkflowGraphNode, WorkflowNodeData } from "@/lib/hooks/useWorkflowState";

function mapNodeColor(node: Node<WorkflowNodeData>): string {
  const status = node.data?.status;

  if (status === "approved") {
    return "#10b981";
  }

  if (status === "pending") {
    return "#f59e0b";
  }

  if (status === "rejected") {
    return "#ef4444";
  }

  return "#94a3b8";
}

function WorkflowNodeCard({ data, selected }: NodeProps<WorkflowNodeData>) {
  const visual = getStatusVisualConfig(data.status);

  return (
    <div
      className={`w-[236px] rounded-2xl px-4 py-3 shadow-lg transition-all ${visual.nodeClassName} ${
        selected ? "ring-2 ring-[#154cb3]/45" : "ring-1 ring-transparent"
      }`}
    >
      <div className="flex items-center justify-between gap-2">
        <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-600">
          {data.kind === "service" ? "Logistics" : "Approval"}
        </p>
        <ApprovalStatusIcon status={data.status} animatePending className="h-4.5 w-4.5" />
      </div>
      <p className="mt-1 text-sm font-semibold text-slate-900">{data.title}</p>
      <p className="mt-1 line-clamp-2 text-xs text-slate-600">{data.description}</p>
      <p className={`mt-2 text-[11px] ${visual.helperTextClassName}`}>
        {data.timestamp ? `Updated ${data.timestamp}` : "Awaiting update"}
      </p>
    </div>
  );
}

const nodeTypes = {
  workflowNode: WorkflowNodeCard,
};

export default function WorkflowMindmapCanvas({
  nodes,
  edges,
  isLoading,
  error,
  onNodeSelect,
}: {
  nodes: WorkflowGraphNode[];
  edges: Edge[];
  isLoading: boolean;
  error: string | null;
  onNodeSelect: (nodeId: string) => void;
}) {
  return (
    <div className="relative h-full min-h-[30rem] overflow-hidden rounded-3xl border border-slate-200 bg-gradient-to-br from-slate-50 via-white to-slate-100 shadow-[0_24px_80px_-26px_rgba(15,23,42,0.38)]">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(21,76,179,0.1),_transparent_60%),radial-gradient(circle_at_bottom,_rgba(2,6,23,0.08),_transparent_55%)]" />

      {isLoading ? (
        <div className="absolute inset-0 z-20 flex items-center justify-center">
          <div className="rounded-2xl border border-slate-200 bg-white/90 px-5 py-3 text-sm font-medium text-slate-700 shadow-lg backdrop-blur">
            Loading workflow state...
          </div>
        </div>
      ) : null}

      {error ? (
        <div className="absolute left-4 top-4 z-20 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700 shadow-md">
          {error}
        </div>
      ) : null}

      <ReactFlow
        nodes={nodes}
        edges={edges}
        nodeTypes={nodeTypes}
        fitView
        fitViewOptions={{ padding: 0.28, maxZoom: 1.12 }}
        minZoom={0.28}
        maxZoom={1.4}
        onNodeClick={(_, node) => onNodeSelect(node.id)}
        nodesDraggable={false}
        nodesConnectable={false}
        elementsSelectable
        className="relative z-10"
        proOptions={{ hideAttribution: true }}
      >
        <Background gap={26} size={1.2} color="#cbd5e1" />
        <MiniMap
          zoomable
          pannable
          nodeColor={mapNodeColor}
          className="!border !border-slate-200 !bg-white/90"
          maskColor="rgba(15,23,42,0.08)"
        />
        <Controls className="!border !border-slate-200 !bg-white" />
      </ReactFlow>
    </div>
  );
}
