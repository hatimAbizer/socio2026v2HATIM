import { fetchLogisticsDashboardData, LogisticsServiceKey, submitLogisticsDecisionFormAction } from "../actions";

interface LogisticsDashboardViewProps {
  service: LogisticsServiceKey;
  title: string;
  subtitle: string;
}

export const dynamic = "force-dynamic";

function formatDateTime(value: string | null): string {
  if (!value) {
    return "Not specified";
  }

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return value;
  }

  return parsed.toLocaleString();
}

export default async function LogisticsDashboardView({
  service,
  title,
  subtitle,
}: LogisticsDashboardViewProps) {
  let errorMessage: string | null = null;
  let dashboardData: Awaited<ReturnType<typeof fetchLogisticsDashboardData>> | null = null;

  try {
    dashboardData = await fetchLogisticsDashboardData(service);
  } catch (error) {
    errorMessage = error instanceof Error ? error.message : "Unable to load dashboard right now.";
  }

  const submitDecision = submitLogisticsDecisionFormAction.bind(null, service);

  return (
    <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <header className="mb-6 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <h1 className="text-2xl font-semibold text-slate-900">{title}</h1>
        <p className="mt-2 text-sm text-slate-600">{subtitle}</p>
        {dashboardData ? (
          <p className="mt-3 text-xs font-medium uppercase tracking-wide text-slate-500">
            Approval Level: {dashboardData.approvalLevel}
          </p>
        ) : null}
      </header>

      {errorMessage ? (
        <section className="rounded-xl border border-rose-300 bg-rose-50 p-4 text-sm text-rose-700">
          {errorMessage}
        </section>
      ) : null}

      {!errorMessage && dashboardData && dashboardData.queue.length === 0 ? (
        <section className="rounded-xl border border-slate-200 bg-slate-50 p-6 text-sm text-slate-700">
          No pending {dashboardData.serviceLabel} logistics approvals are waiting in this queue.
        </section>
      ) : null}

      {!errorMessage && dashboardData && dashboardData.queue.length > 0 ? (
        <section className="space-y-4">
          {dashboardData.queue.map((item) => (
            <article key={item.approvalRequestDbId} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                <div className="space-y-1">
                  <h2 className="text-lg font-semibold text-slate-900">{item.eventTitle}</h2>
                  <p className="text-sm text-slate-600">Event ID: {item.eventId}</p>
                  <p className="text-sm text-slate-600">Request ID: {item.requestId}</p>
                  <p className="text-sm text-slate-600">Requested by: {item.requestedByEmail || "Unknown"}</p>
                  <p className="text-sm text-slate-600">Submitted: {formatDateTime(item.submittedAt)}</p>
                  <p className="text-sm text-slate-600">
                    Scope: {item.departmentName || "Unknown Department"} / {item.schoolName || "Unknown School"}
                  </p>
                  <p className="text-sm text-slate-600">Campus: {item.campusName || "Unknown Campus"}</p>
                </div>

                <div className="w-full rounded-xl border border-slate-200 bg-slate-50 p-4 lg:max-w-xl">
                  <p className="text-sm font-semibold text-slate-800">Service Context</p>
                  <p className="mt-1 text-sm text-slate-700">{item.contextSummary}</p>
                  <dl className="mt-3 grid gap-2 sm:grid-cols-2">
                    {item.contextFields.map((field) => (
                      <div key={`${item.approvalRequestDbId}-${field.label}`} className="rounded-md bg-white p-2">
                        <dt className="text-xs font-medium uppercase tracking-wide text-slate-500">{field.label}</dt>
                        <dd className="mt-1 text-sm text-slate-800">{field.value}</dd>
                      </div>
                    ))}
                  </dl>
                </div>
              </div>

              <form action={submitDecision} className="mt-5 rounded-xl border border-slate-200 bg-slate-50 p-4">
                <input type="hidden" name="requestId" value={item.approvalRequestDbId} />

                <label htmlFor={`note-${item.approvalRequestDbId}`} className="mb-2 block text-sm font-medium text-slate-700">
                  Decision Note (mandatory 20+ characters for Reject/Return)
                </label>
                <textarea
                  id={`note-${item.approvalRequestDbId}`}
                  name="note"
                  placeholder="Add reason, dependencies, or revision points..."
                  minLength={20}
                  rows={3}
                  className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-800 outline-none ring-slate-300 focus:border-slate-500 focus:ring"
                />

                <div className="mt-3 flex flex-wrap gap-2">
                  <button
                    type="submit"
                    name="action"
                    value="approve"
                    className="rounded-md bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700"
                  >
                    Approve
                  </button>
                  <button
                    type="submit"
                    name="action"
                    value="reject"
                    className="rounded-md bg-rose-600 px-4 py-2 text-sm font-semibold text-white hover:bg-rose-700"
                  >
                    Reject
                  </button>
                  <button
                    type="submit"
                    name="action"
                    value="return"
                    className="rounded-md bg-amber-500 px-4 py-2 text-sm font-semibold text-slate-900 hover:bg-amber-400"
                  >
                    Return for Revision
                  </button>
                </div>
              </form>
            </article>
          ))}
        </section>
      ) : null}
    </main>
  );
}
