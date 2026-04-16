import LogisticsDashboardView from "../logistics/_components/LogisticsDashboardView";

export const dynamic = "force-dynamic";

export default async function CateringManagePage() {
  return (
    <LogisticsDashboardView
      service="catering"
      title="Catering Service Dashboard"
      subtitle="Review pending L5 catering approvals created only when catering plans were requested by the coordinator."
    />
  );
}
