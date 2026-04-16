import LogisticsDashboardView from "../logistics/_components/LogisticsDashboardView";

export const dynamic = "force-dynamic";

export default async function ItManagePage() {
  return (
    <LogisticsDashboardView
      service="it"
      title="IT Service Dashboard"
      subtitle="Review pending L5 IT approvals created only for events that requested technical resources."
    />
  );
}
