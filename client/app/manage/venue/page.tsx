import LogisticsDashboardView from "../logistics/_components/LogisticsDashboardView";

export const dynamic = "force-dynamic";

export default async function VenueManagePage() {
  return (
    <LogisticsDashboardView
      service="venue"
      title="Venue Service Dashboard"
      subtitle="Review pending L5 venue approvals generated only for events with venue booking requests."
    />
  );
}
