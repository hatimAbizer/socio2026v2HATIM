import LogisticsDashboardView from "../logistics/_components/LogisticsDashboardView";

export const dynamic = "force-dynamic";

export default async function StallsManagePage() {
  return (
    <LogisticsDashboardView
      service="stalls"
      title="Stalls Service Dashboard"
      subtitle="Review pending L5 stalls approvals generated only for events that explicitly requested stalls."
    />
  );
}
