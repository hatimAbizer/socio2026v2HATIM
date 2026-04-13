"use client";

import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { RolesAnalytics } from "./types";

type RolesAnalyticsPanelProps = {
  analytics: RolesAnalytics;
  isLoading: boolean;
  error: string | null;
};

function formatCurrency(value: number) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(value);
}

function hasAnalyticsData(analytics: RolesAnalytics): boolean {
  return (
    analytics.totalEstimatedRevenue > 0 ||
    analytics.venueUtilizationRate > 0 ||
    analytics.averageApprovalSlaHours > 0 ||
    analytics.revenueByMonth.length > 0 ||
    analytics.venueUsage.length > 0 ||
    analytics.approvalSlaByMonth.length > 0
  );
}

export default function RolesAnalyticsPanel({ analytics, isLoading, error }: RolesAnalyticsPanelProps) {
  const hasData = hasAnalyticsData(analytics);

  if (isLoading && !hasData) {
    return (
      <div className="rounded-2xl border border-slate-200 bg-white p-6 text-sm text-slate-500 shadow-sm">
        Loading global analytics...
      </div>
    );
  }

  if (error && !hasData) {
    return (
      <div className="rounded-2xl border border-rose-200 bg-white p-6 text-sm text-rose-600 shadow-sm">
        {error}
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {isLoading && hasData && (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-xs font-semibold text-amber-700">
          Refreshing analytics...
        </div>
      )}

      {error && hasData && (
        <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-xs font-semibold text-rose-700">
          {error}
        </div>
      )}

      <div className="grid gap-4 md:grid-cols-3">
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-xs font-bold uppercase tracking-wide text-slate-500">Global Revenue</p>
          <p className="mt-3 text-2xl font-black text-slate-900">
            {formatCurrency(analytics.totalEstimatedRevenue)}
          </p>
          <p className="mt-1 text-xs text-slate-500">Estimated from fee-enabled events and participation counts.</p>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-xs font-bold uppercase tracking-wide text-slate-500">Venue Utilization</p>
          <p className="mt-3 text-2xl font-black text-slate-900">{analytics.venueUtilizationRate.toFixed(2)}%</p>
          <p className="mt-1 text-xs text-slate-500">Share of events that have an assigned venue.</p>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-xs font-bold uppercase tracking-wide text-slate-500">Approval SLA</p>
          <p className="mt-3 text-2xl font-black text-slate-900">{analytics.averageApprovalSlaHours.toFixed(2)} hrs</p>
          <p className="mt-1 text-xs text-slate-500">Average submitted-to-decided duration across approvals.</p>
        </div>
      </div>

      <div className="grid gap-5 lg:grid-cols-2">
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <h3 className="text-base font-bold text-slate-900">Revenue Trend</h3>
          <p className="mt-1 text-xs text-slate-500">Monthly estimated revenue across all events.</p>
          <div className="mt-4 h-72">
            {analytics.revenueByMonth.length === 0 ? (
              <div className="flex h-full items-center justify-center text-sm text-slate-500">
                No revenue data available.
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={analytics.revenueByMonth}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis dataKey="month" tick={{ fontSize: 12 }} />
                  <YAxis tick={{ fontSize: 12 }} />
                  <Tooltip formatter={(value: number) => formatCurrency(Number(value || 0))} />
                  <Area type="monotone" dataKey="revenue" stroke="#0f766e" fill="#99f6e4" />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <h3 className="text-base font-bold text-slate-900">Venue Utilization Mix</h3>
          <p className="mt-1 text-xs text-slate-500">Top venues by event volume.</p>
          <div className="mt-4 h-72">
            {analytics.venueUsage.length === 0 ? (
              <div className="flex h-full items-center justify-center text-sm text-slate-500">
                No venue usage data available.
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={analytics.venueUsage}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis dataKey="venue" tick={{ fontSize: 11 }} />
                  <YAxis allowDecimals={false} tick={{ fontSize: 12 }} />
                  <Tooltip formatter={(value: number) => Number(value || 0)} />
                  <Bar dataKey="events" fill="#0284c7" />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <h3 className="text-base font-bold text-slate-900">Approval SLA by Month</h3>
        <p className="mt-1 text-xs text-slate-500">Average turnaround time by submission month.</p>
        <div className="mt-4 h-72">
          {analytics.approvalSlaByMonth.length === 0 ? (
            <div className="flex h-full items-center justify-center text-sm text-slate-500">
              No approval SLA data available.
            </div>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={analytics.approvalSlaByMonth}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="month" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} />
                <Tooltip formatter={(value: number) => `${Number(value || 0).toFixed(2)} hrs`} />
                <Line type="monotone" dataKey="hours" stroke="#7c3aed" strokeWidth={2.5} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>
    </div>
  );
}
