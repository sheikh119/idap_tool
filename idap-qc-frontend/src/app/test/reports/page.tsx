"use client";

import { keepPreviousData, useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { useState, type FormEvent } from "react";
import { Button, Field, Input, PageHeader, Select } from "@/components/ui";
import { DB_REPORT_STATUSES } from "@/lib/db/enums";
import { DataTable, ErrorNote, Options, Panel, Pill, SuccessNote, enumOptions } from "../_components/kit";
import { api, query, readForm, useActorId } from "../_lib/client";
import { useApiMutation, usePackages, useProjects, useTemplates, useUsers, type Page, type Row } from "../_lib/queries";

const PAGE_SIZE = 10;

export default function ReportsPage() {
  const projects = useProjects();
  const users = useUsers();
  const [filters, setFilters] = useState<Record<string, string>>({});
  const [offset, setOffset] = useState(0);
  const packages = usePackages(filters.project_id || undefined);

  const reports = useQuery({
    queryKey: ["reports", filters, offset],
    queryFn: () => api<Page>(`/reports${query({ ...filters, limit: String(PAGE_SIZE), offset: String(offset) })}`),
    placeholderData: keepPreviousData,
    staleTime: 0,
  });

  const set = (key: string, value: string) => {
    setFilters((current) => ({ ...current, [key]: value, ...(key === "project_id" ? { package_id: "" } : {}) }));
    setOffset(0);
  };
  const total = reports.data?.total ?? 0;

  return (
    <>
      <PageHeader title="Reports" description="GET /api/reports (v_report_summary) · POST /api/reports" />

      <Panel title="Filters">
        <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-6">
          <Field label="Project">
            <Select value={filters.project_id ?? ""} onChange={(event) => set("project_id", event.target.value)}>
              <Options
                placeholder="All"
                items={(projects.data ?? []).map((project) => ({ value: project.id, label: project.project_code }))}
              />
            </Select>
          </Field>
          <Field label="Package">
            <Select
              value={filters.package_id ?? ""}
              onChange={(event) => set("package_id", event.target.value)}
              disabled={!filters.project_id}
            >
              <Options placeholder="All" items={(packages.data ?? []).map((pkg) => ({ value: pkg.id, label: pkg.package_code }))} />
            </Select>
          </Field>
          <Field label="Status">
            <Select value={filters.status ?? ""} onChange={(event) => set("status", event.target.value)}>
              <Options placeholder="Any" items={enumOptions(DB_REPORT_STATUSES)} />
              <option value="SUBMITTED,UNDER_REVIEW">Awaiting review (csv)</option>
            </Select>
          </Field>
          <Field label="Created by">
            <Select value={filters.created_by ?? ""} onChange={(event) => set("created_by", event.target.value)}>
              <Options placeholder="Anyone" items={(users.data ?? []).map((user) => ({ value: user.id, label: user.name }))} />
            </Select>
          </Field>
          <Field label="Visit from">
            <Input type="date" value={filters.from ?? ""} onChange={(event) => set("from", event.target.value)} />
          </Field>
          <Field label="Visit to">
            <Input type="date" value={filters.to ?? ""} onChange={(event) => set("to", event.target.value)} />
          </Field>
          <Field label="Search">
            <Input value={filters.q ?? ""} onChange={(event) => set("q", event.target.value)} placeholder="title or document no" />
          </Field>
        </div>
      </Panel>

      <Panel
        title={`Reports · ${total} total`}
        actions={
          <div className="flex items-center gap-2 text-sm">
            <Button variant="secondary" disabled={offset === 0} onClick={() => setOffset(Math.max(0, offset - PAGE_SIZE))}>
              Prev
            </Button>
            <span>
              {total ? offset + 1 : 0}–{Math.min(offset + PAGE_SIZE, total)}
            </span>
            <Button variant="secondary" disabled={offset + PAGE_SIZE >= total} onClick={() => setOffset(offset + PAGE_SIZE)}>
              Next
            </Button>
          </div>
        }
      >
        <ErrorNote error={reports.error} />
        <DataTable
          rows={reports.data?.items}
          rowKey={(row) => row.report_id}
          empty="No reports match"
          columns={[
            {
              key: "document_no",
              label: "Document no",
              render: (row) => (
                <Link href={`/test/reports/${row.report_id}`} className="font-mono text-xs font-semibold text-teal-800 hover:underline">
                  {row.document_no}
                </Link>
              ),
            },
            { key: "title", label: "Title" },
            { key: "package_code", label: "Package", render: (row) => row.package_code ?? "project-wide" },
            { key: "site_visit_date", label: "Visit" },
            { key: "status", label: "Status", render: (row) => <Pill value={row.status} /> },
            { key: "issue_count", label: "Obs" },
            { key: "critical_count", label: "Critical" },
            { key: "created_by_name", label: "Created by" },
            { key: "approved_by_name", label: "Approved by" },
          ]}
        />
      </Panel>

      <CreateReportPanel />
    </>
  );
}

function CreateReportPanel() {
  const actorId = useActorId();
  const projects = useProjects();
  const templates = useTemplates();
  const [projectId, setProjectId] = useState("");
  const [visitDate, setVisitDate] = useState("");
  const packages = usePackages(projectId || undefined);

  const nextNumber = useQuery({
    queryKey: ["next-number", projectId, visitDate],
    queryFn: () => api<{ document_no: string }>(`/reports/next-number${query({ project_id: projectId, visit_date: visitDate })}`),
    enabled: Boolean(projectId),
    staleTime: 0,
  });

  const create = useApiMutation((body: Record<string, unknown>) => api<Row>("/reports", { method: "POST", body }));

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    create.mutate(readForm(event.currentTarget));
  }

  return (
    <Panel title="Create report" description="POST /api/reports. document_no is generated when left blank.">
      {!actorId && <p className="text-sm text-amber-700">Select an acting user in the sidebar first (otherwise 401).</p>}
      <form onSubmit={submit} className="grid gap-3 sm:grid-cols-3">
        <Field label="Project">
          <Select name="project_id" required value={projectId} onChange={(event) => setProjectId(event.target.value)}>
            <Options
              placeholder="Choose project"
              items={(projects.data ?? []).map((project) => ({ value: project.id, label: `${project.project_code} · ${project.name}` }))}
            />
          </Select>
        </Field>
        <Field label="Package">
          <Select name="package_id" defaultValue="" key={projectId}>
            <Options
              placeholder="(project-wide)"
              items={(packages.data ?? []).map((pkg) => ({ value: pkg.id, label: `${pkg.package_code} · ${pkg.name}` }))}
            />
          </Select>
        </Field>
        <Field label="Template">
          <Select name="report_template_id" defaultValue="">
            <Options
              placeholder="(none)"
              items={(templates.data ?? []).map((template) => ({
                value: template.id,
                label: `${template.name} v${template.version}${template.is_active ? "" : " (retired)"}`,
              }))}
            />
          </Select>
        </Field>
        <Field label="Title">
          <Input name="title" required defaultValue="Weekly Site Quality Inspection" />
        </Field>
        <Field label="Site visit date">
          <Input name="site_visit_date" type="date" required value={visitDate} onChange={(event) => setVisitDate(event.target.value)} />
        </Field>
        <Field label={`Document no (next: ${nextNumber.data?.document_no ?? "choose project"})`}>
          <Input name="document_no" placeholder="leave blank to auto-generate" />
        </Field>
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" name="with_default_sections" defaultChecked /> Create the 5 default sections
        </label>
        <div className="grid gap-2 sm:col-span-3">
          <ErrorNote error={create.error ?? nextNumber.error} />
          {create.isSuccess && (
            <SuccessNote>
              Created{" "}
              <Link href={`/test/reports/${create.data.report_id}`} className="font-semibold underline">
                {create.data.document_no}
              </Link>
            </SuccessNote>
          )}
          <div>
            <Button type="submit" disabled={create.isPending}>
              Create report
            </Button>
          </div>
        </div>
      </form>
    </Panel>
  );
}
