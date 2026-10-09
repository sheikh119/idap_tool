"use client";

import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import type { FormEvent, ReactNode } from "react";
import { Button, Field, Input, PageHeader, Select, Textarea } from "@/components/ui";
import { DB_ISSUE_SEVERITIES, DB_ISSUE_STATUSES } from "@/lib/db/enums";
import { DataTable, ErrorNote, JsonView, Options, Panel, Pill, SuccessNote, enumOptions, formatDate } from "../../_components/kit";
import { api, readForm } from "../../_lib/client";
import { useApiMutation, useLocations, type Row } from "../../_lib/queries";

export function IssueDetail({ id }: { id: string }) {
  const issue = useQuery({ queryKey: ["issue", id], queryFn: () => api<Row>(`/issues/${id}`), staleTime: 0 });
  const locations = useLocations(issue.data?.project_id);

  const statusChange = useApiMutation((body: Record<string, unknown>) => api(`/issues/${id}`, { method: "PATCH", body }));
  const edit = useApiMutation((body: Record<string, unknown>) => api(`/issues/${id}`, { method: "PATCH", body }));

  if (issue.error) return <ErrorNote error={issue.error} />;
  if (!issue.data) return <p className="text-sm text-slate-500">Loading issue…</p>;
  const data = issue.data;
  const inApprovedReport = data.reports?.some((link: Row) => link.report?.status === "APPROVED");

  function submitStatus(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    statusChange.mutate(readForm(form), { onSuccess: () => form.reset() });
  }

  function submitEdit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const changed = Object.fromEntries(
      Object.entries(readForm(event.currentTarget)).filter(([key, value]) => value !== (data[key] ?? null)),
    );
    edit.mutate(changed);
  }

  return (
    <>
      <PageHeader
        title={data.title}
        description={`${data.project_code} · ${data.location_path}`}
        actions={
          <Link href="/test/issues" className="text-sm text-teal-800 hover:underline">
            ← All issues
          </Link>
        }
      />

      <Panel title="Summary">
        <dl className="grid gap-x-6 gap-y-2 text-sm sm:grid-cols-3">
          <Detail label="Status" value={<Pill value={data.status} />} />
          <Detail label="Severity" value={<Pill value={data.severity} />} />
          <Detail label="Template" value={data.generic_issue_code ? `${data.generic_issue_code} · ${data.generic_issue_title}` : "freehand"} />
          <Detail label="Category" value={data.category_name} />
          <Detail label="Package" value={data.package_code} />
          <Detail label="Reporter" value={`${data.reporter_name} (${data.reporter_role})`} />
          <Detail label="Observed" value={formatDate(data.observed_at)} />
          <Detail label="Location details" value={data.location_details} />
          <Detail label="Images" value={data.image_count} />
        </dl>
        <p className="text-sm whitespace-pre-wrap">{data.description}</p>
        {data.root_cause && <p className="text-sm"><strong>Root cause:</strong> {data.root_cause}</p>}
        {data.risk_description && <p className="text-sm"><strong>Risk:</strong> {data.risk_description}</p>}
      </Panel>

      <Panel
        title="Change status"
        description="PATCH /api/issues/:id { status, comment }. The comment is stored on the issue_history row."
      >
        <form onSubmit={submitStatus} className="flex flex-wrap items-end gap-2">
          <Field label="New status">
            <Select name="status" required defaultValue="">
              <Options placeholder="Choose" items={enumOptions(DB_ISSUE_STATUSES)} />
            </Select>
          </Field>
          <div className="min-w-64 flex-1">
            <Field label="Comment">
              <Input name="comment" placeholder="Why the status changed" />
            </Field>
          </div>
          <Button type="submit" disabled={statusChange.isPending}>
            Update status
          </Button>
        </form>
        <ErrorNote error={statusChange.error} />
      </Panel>

      <Panel
        title="Edit issue"
        description={
          inApprovedReport
            ? "This issue is in an APPROVED report: text and location edits should be rejected (status changes still allowed)."
            : "PATCH /api/issues/:id with only the fields you changed (no changes → 400)."
        }
      >
        <form onSubmit={submitEdit} className="grid gap-3 sm:grid-cols-3" key={data.updated_at}>
          <Field label="Title">
            <Input name="title" defaultValue={data.title} />
          </Field>
          <Field label="Severity">
            <Select name="severity" defaultValue={data.severity}>
              <Options items={enumOptions(DB_ISSUE_SEVERITIES)} />
            </Select>
          </Field>
          <Field label="Location (same project only)">
            <Select name="site_location_id" defaultValue={data.site_location_id}>
              <Options
                items={(locations.data ?? []).map((location) => ({ value: location.location_id, label: location.full_path }))}
              />
            </Select>
          </Field>
          <Field label="Description">
            <Textarea name="description" defaultValue={data.description} />
          </Field>
          <Field label="Root cause">
            <Textarea name="root_cause" defaultValue={data.root_cause ?? ""} data-nullable />
          </Field>
          <Field label="Risk">
            <Textarea name="risk_description" defaultValue={data.risk_description ?? ""} data-nullable />
          </Field>
          <Field label="Location details">
            <Input name="location_details" defaultValue={data.location_details ?? ""} data-nullable />
          </Field>
          <div className="grid gap-2 sm:col-span-3">
            <ErrorNote error={edit.error} />
            {edit.isSuccess && <SuccessNote>Saved</SuccessNote>}
            <div>
              <Button type="submit" disabled={edit.isPending}>
                Save changed fields
              </Button>
            </div>
          </div>
        </form>
      </Panel>

      <Panel title="Status history" description="issue_history (append-only, written by trigger)">
        <DataTable
          rows={data.history}
          rowKey={(row) => row.id}
          empty="No status changes yet"
          columns={[
            { key: "created_at", label: "When", render: (row) => formatDate(row.created_at) },
            { key: "old_status", label: "From", render: (row) => <Pill value={row.old_status} /> },
            { key: "new_status", label: "To", render: (row) => <Pill value={row.new_status} /> },
            { key: "changed_by_user", label: "By", render: (row) => row.changed_by_user?.name },
            { key: "comment", label: "Comment" },
          ]}
        />
      </Panel>

      <Panel title="Appears in reports">
        <DataTable
          rows={data.reports}
          rowKey={(row) => row.report.id}
          empty="Not in any report"
          columns={[
            {
              key: "document_no",
              label: "Report",
              render: (row) => (
                <Link href={`/test/reports/${row.report.id}`} className="font-mono text-xs text-teal-800 hover:underline">
                  {row.report.document_no}
                </Link>
              ),
            },
            { key: "title", label: "Title", render: (row) => row.report.title },
            { key: "status", label: "Status", render: (row) => <Pill value={row.report.status} /> },
            { key: "observation_no", label: "Obs #" },
          ]}
        />
      </Panel>

      <JsonView value={data} />
    </>
  );
}

function Detail({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div>
      <dt className="text-xs text-slate-500">{label}</dt>
      <dd>{value ?? "—"}</dd>
    </div>
  );
}
