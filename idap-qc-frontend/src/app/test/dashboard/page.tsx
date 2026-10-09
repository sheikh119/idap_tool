"use client";

import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { PageHeader } from "@/components/ui";
import { IssueFilters, type Filters } from "../_components/filters";
import { Counts, ErrorNote, JsonView, Panel } from "../_components/kit";
import { api, query } from "../_lib/client";

type Dashboard = {
  issues: {
    total: number;
    unresolved: number;
    unresolvedCritical: number;
    byStatus: Record<string, number>;
    bySeverity: Record<string, number>;
    byCategory: Record<string, number>;
    byLocation: Record<string, number>;
    byProject: Record<string, number>;
    byPackage: Record<string, number>;
    byReporter: Record<string, number>;
  };
  reports: { total: number; awaitingReview: number; byStatus: Record<string, number> };
  generatedAt: string;
};

export default function DashboardPage() {
  const [filters, setFilters] = useState<Filters>({});
  const dashboard = useQuery({
    queryKey: ["dashboard", filters],
    queryFn: () => api<Dashboard>(`/dashboard${query(filters)}`),
    placeholderData: keepPreviousData,
    staleTime: 0,
  });
  const data = dashboard.data;

  return (
    <>
      <PageHeader title="Dashboard" description="GET /api/dashboard. Report counts honour only project, package and date filters." />

      <Panel title="Filters">
        <IssueFilters value={filters} onChange={setFilters} search={false} />
      </Panel>

      <ErrorNote error={dashboard.error} />
      {data && (
        <>
          <div className="grid gap-3 sm:grid-cols-5">
            <Stat label="Issues" value={data.issues.total} />
            <Stat label="Unresolved" value={data.issues.unresolved} />
            <Stat label="Unresolved critical" value={data.issues.unresolvedCritical} tone="text-red-700" />
            <Stat label="Reports" value={data.reports.total} />
            <Stat label="Awaiting review" value={data.reports.awaitingReview} tone="text-amber-700" />
          </div>
          <Panel title="Breakdowns">
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <Counts title="Issues by status" counts={data.issues.byStatus} />
              <Counts title="Issues by severity" counts={data.issues.bySeverity} />
              <Counts title="Reports by status" counts={data.reports.byStatus} />
              <Counts title="Issues by category" counts={data.issues.byCategory} />
              <Counts title="Issues by project" counts={data.issues.byProject} />
              <Counts title="Issues by package" counts={data.issues.byPackage} />
              <Counts title="Issues by reporter" counts={data.issues.byReporter} />
              <Counts title="Issues by location" counts={data.issues.byLocation} />
            </div>
          </Panel>
          <JsonView value={data} />
        </>
      )}
    </>
  );
}

function Stat({ label, value, tone = "text-slate-900" }: { label: string; value: number; tone?: string }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <p className="text-xs text-slate-500">{label}</p>
      <p className={`text-3xl font-bold ${tone}`}>{value}</p>
    </div>
  );
}
