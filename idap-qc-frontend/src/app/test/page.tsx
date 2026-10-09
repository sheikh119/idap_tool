"use client";

import { useQuery } from "@tanstack/react-query";
import { PageHeader } from "@/components/ui";
import { DataTable, ErrorNote, Panel } from "./_components/kit";
import { api } from "./_lib/client";

const PERSONAS = [
  { name: "Tariq Mehmood", role: "GM", use: "Approve / reopen anything; has access to every project" },
  { name: "Nadia Rehman", role: "GM", use: "Approving an RWP report fails: no project access" },
  { name: "Sara Ali", role: "Manager", use: "Start review / reject on NZE, RWP, MUL; approval fails" },
  { name: "Bilal Hussain", role: "AM", use: "Review / reject on NZE only" },
  { name: "Ahsan Khan", role: "AE", use: "Create issues and reports on NZE + RWP; review fails (role)" },
  { name: "Fatima Noor", role: "AE", use: "RWP engineer" },
  { name: "Usman Raza", role: "IC", use: "Consultant on NZE; can submit" },
  { name: "Kamran Javed", role: "Manager", use: "Inactive: every write returns 403" },
  { name: "Hira Saleem", role: "AE", use: "No project assignments: writes return 403" },
  { name: "Zainab Akhtar", role: "AM", use: "RWP assignment disabled: access denied" },
];

const REPORTS = [
  { doc: "QC-NZE-LHR-2026-005", status: "DRAFT", use: "Full section structure; add/remove/renumber observations, submit" },
  { doc: "QC-NZE-LHR-2026-001", status: "APPROVED", use: "Immutable; its issues' text is frozen" },
  { doc: "QC-NZE-LHR-2026-002", status: "REJECTED", use: "Editable again; resubmit" },
  { doc: "QC-NZE-LHR-2026-003", status: "UNDER_REVIEW", use: "Approve (GM) or reject (comment)" },
  { doc: "QC-NZE-LHR-2026-004", status: "SUBMITTED", use: "Start review; observation 3 has no section" },
  { doc: "QC-RWP-ROAD-2026-001", status: "APPROVED", use: "Approved on the road project" },
  { doc: "QC-RWP-ROAD-2026-002", status: "REOPENED", use: "Reopened by GM; can be resubmitted" },
  { doc: "QC-RWP-ROAD-2026-003", status: "DRAFT", use: "No observations: submit fails" },
];

export default function TestOverviewPage() {
  const health = useQuery({
    queryKey: ["health"],
    queryFn: () => api<{ ok: boolean; counts: Record<string, number> }>("/health"),
    staleTime: 0,
  });

  return (
    <>
      <PageHeader
        title="API test bench"
        description="Pick an acting user in the sidebar: write requests send their id in the x-actor-id header."
      />

      <Panel title="Database connection" description="GET /api/health counts rows in every table.">
        <ErrorNote error={health.error} />
        {health.data && (
          <div className="grid grid-cols-2 gap-2 text-sm sm:grid-cols-3 lg:grid-cols-5">
            {Object.entries(health.data.counts).map(([table, count]) => (
              <div key={table} className="rounded-lg border border-slate-200 px-3 py-2">
                <p className="text-xs text-slate-500">{table}</p>
                <p className="font-mono text-lg font-semibold">{count}</p>
              </div>
            ))}
          </div>
        )}
      </Panel>

      <Panel title="Seeded personas" description="Switch the acting user to exercise role and access rules.">
        <DataTable
          rows={PERSONAS}
          rowKey={(row) => row.name}
          columns={[
            { key: "name", label: "User" },
            { key: "role", label: "Role" },
            { key: "use", label: "What to test" },
          ]}
        />
      </Panel>

      <Panel title="Seeded reports" description="One report per workflow state.">
        <DataTable
          rows={REPORTS}
          rowKey={(row) => row.doc}
          columns={[
            { key: "doc", label: "Document no", className: "font-mono text-xs" },
            { key: "status", label: "Status" },
            { key: "use", label: "What to test" },
          ]}
        />
      </Panel>
    </>
  );
}
