import { notFound } from "next/navigation";

import WorkflowTrackerPageClient from "@/app/workflows/_components/WorkflowTrackerPageClient";
import type { WorkflowType } from "@/lib/hooks/useWorkflowState";

type WorkflowPageParams = {
  type: string;
  id: string;
};

type WorkflowPageProps = {
  params: Promise<WorkflowPageParams>;
};

export default async function WorkflowPage({ params }: WorkflowPageProps) {
  const resolvedParams = await params;
  const normalizedType = String(resolvedParams?.type || "").trim().toLowerCase();
  const workflowId = decodeURIComponent(String(resolvedParams?.id || "").trim());

  if (!workflowId || (normalizedType !== "event" && normalizedType !== "fest")) {
    notFound();
  }

  return (
    <WorkflowTrackerPageClient
      workflowType={normalizedType as WorkflowType}
      workflowId={workflowId}
    />
  );
}
