"use client";

import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { useState, type ButtonHTMLAttributes, type FormEvent, type ReactNode } from "react";
import { Button, Field, Input, PageHeader, Select, Textarea } from "@/components/ui";
import { EDITABLE_REPORT_STATUSES, REPORT_SECTION_TYPES, REPORT_WORKFLOW_ACTIONS } from "@/lib/db/enums";
import { DataTable, ErrorNote, JsonView, Options, Panel, Pill, SuccessNote, enumOptions, formatDate } from "../../_components/kit";
import { api, query, readForm } from "../../_lib/client";
import { useApiMutation, useLocations, usePackages, useTemplates, type Page, type Row } from "../../_lib/queries";

const NEXT_ACTIONS: Record<string, string[]> = {
  DRAFT: ["submit"],
  REJECTED: ["submit"],
  REOPENED: ["submit"],
  SUBMITTED: ["review", "reject"],
  UNDER_REVIEW: ["approve", "reject"],
  APPROVED: ["reopen"],
};

export function ReportDetail({ id }: { id: string }) {
  const report = useQuery({ queryKey: ["report", id], queryFn: () => api<Row>(`/reports/${id}`), staleTime: 0 });

  if (report.error) return <ErrorNote error={report.error} />;
  if (!report.data) return <p className="text-sm text-slate-500">Loading report…</p>;
  const data = report.data;
  const editable = (EDITABLE_REPORT_STATUSES as readonly string[]).includes(data.status);

  return (
    <>
      <PageHeader
        title={`${data.document_no} · ${data.title}`}
        description={`${data.project_code} · ${data.package_code ?? "project-wide"} · visit ${data.site_visit_date}`}
        actions={
          <Link href="/test/reports" className="text-sm text-teal-800 hover:underline">
            ← All reports
          </Link>
        }
      />

      <Panel title="Summary">
        <dl className="grid gap-x-6 gap-y-2 text-sm sm:grid-cols-4">
          <Detail label="Status" value={<Pill value={data.status} />} />
          <Detail label="Observations" value={`${data.issue_count} (${data.critical_count} critical, ${data.high_count} high)`} />
          <Detail label="Template" value={data.template ? `${data.template.name} v${data.template.version}` : null} />
          <Detail label="Created by" value={data.created_by_name} />
          <Detail label="Submitted" value={formatDate(data.submitted_at)} />
          <Detail label="Reviewed" value={data.reviewed_by_name && `${data.reviewed_by_name} · ${formatDate(data.reviewed_at)}`} />
          <Detail label="Approved" value={data.approved_by_name && `${data.approved_by_name} · ${formatDate(data.approved_at)}`} />
          <Detail label="Review comments" value={data.review_comments} />
        </dl>
        {!editable && (
          <p className="text-sm text-amber-700">
            Report is {data.status}: sections, observations and metadata are locked. Try editing anyway to see the 422.
          </p>
        )}
      </Panel>

      <WorkflowPanel id={id} status={data.status} />
      <MetadataPanel id={id} report={data} />
      <SectionsPanel id={id} report={data} />
      <ObservationsPanel id={id} report={data} />

      <Panel title="Workflow history" description="report_history (written by the workflow procedures)">
        <DataTable
          rows={data.history}
          rowKey={(row) => row.id}
          empty="No workflow actions yet"
          columns={[
            { key: "created_at", label: "When", render: (row) => formatDate(row.created_at) },
            { key: "action", label: "Action", render: (row) => <Pill value={row.action} /> },
            { key: "old_status", label: "From", render: (row) => <Pill value={row.old_status} /> },
            { key: "new_status", label: "To", render: (row) => <Pill value={row.new_status} /> },
            { key: "action_by_user", label: "By", render: (row) => row.action_by_user && `${row.action_by_user.name} (${row.action_by_user.role_name})` },
            { key: "comment", label: "Comment" },
          ]}
        />
      </Panel>

      <PayloadPanel id={id} />
      <JsonView value={data} label="Raw GET /api/reports/:id" />
    </>
  );
}

function WorkflowPanel({ id, status }: { id: string; status: string }) {
  const [comment, setComment] = useState("");
  const transition = useApiMutation((body: { action: string; comment?: string }) =>
    api<Row>(`/reports/${id}/workflow`, { method: "POST", body }),
  );
  const expected = NEXT_ACTIONS[status] ?? [];

  return (
    <Panel
      title="Workflow"
      description="POST /api/reports/:id/workflow. Highlighted buttons are valid from the current status; the others should be rejected by the DB."
    >
      <Field label="Comment (required for reject and reopen)">
        <Textarea value={comment} onChange={(event) => setComment(event.target.value)} rows={2} />
      </Field>
      <div className="flex flex-wrap gap-2">
        {REPORT_WORKFLOW_ACTIONS.map((action) => (
          <Button
            key={action}
            type="button"
            variant={expected.includes(action) ? "primary" : "secondary"}
            disabled={transition.isPending}
            onClick={() =>
              transition.mutate({ action, comment: comment || undefined }, { onSuccess: () => setComment("") })
            }
          >
            {action}
          </Button>
        ))}
      </div>
      <ErrorNote error={transition.error} />
      {transition.isSuccess && (
        <SuccessNote>
          Report is now <strong>{transition.data.status}</strong>
        </SuccessNote>
      )}
    </Panel>
  );
}

function MetadataPanel({ id, report }: { id: string; report: Row }) {
  const templates = useTemplates();
  const packages = usePackages(report.project_id);
  const update = useApiMutation((body: Record<string, unknown>) => api(`/reports/${id}`, { method: "PATCH", body }));

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const current: Row = {
      title: report.title,
      site_visit_date: report.site_visit_date,
      report_template_id: report.report_template_id,
      package_id: report.package_id,
    };
    const changed = Object.fromEntries(
      Object.entries(readForm(event.currentTarget)).filter(([key, value]) => value !== (current[key] ?? null)),
    );
    update.mutate(changed);
  }

  return (
    <Panel title="Report details" description="PATCH /api/reports/:id (changed fields only). Changing package requires an empty report.">
      <form onSubmit={submit} className="grid gap-3 sm:grid-cols-4" key={report.updated_at}>
        <Field label="Title">
          <Input name="title" defaultValue={report.title} />
        </Field>
        <Field label="Site visit date">
          <Input name="site_visit_date" type="date" defaultValue={report.site_visit_date} />
        </Field>
        <Field label="Template">
          <Select name="report_template_id" defaultValue={report.report_template_id ?? ""} data-nullable>
            <Options
              placeholder="(none)"
              items={(templates.data ?? []).map((template) => ({
                value: template.id,
                label: `${template.name} v${template.version}${template.is_active ? "" : " (retired)"}`,
              }))}
            />
          </Select>
        </Field>
        <Field label="Package">
          <Select name="package_id" defaultValue={report.package_id ?? ""} data-nullable>
            <Options
              placeholder="(project-wide)"
              items={(packages.data ?? []).map((pkg) => ({ value: pkg.id, label: `${pkg.package_code} · ${pkg.name}` }))}
            />
          </Select>
        </Field>
        <div className="grid gap-2 sm:col-span-4">
          <ErrorNote error={update.error} />
          {update.isSuccess && <SuccessNote>Saved</SuccessNote>}
          <div>
            <Button type="submit" disabled={update.isPending}>
              Save details
            </Button>
          </div>
        </div>
      </form>
    </Panel>
  );
}

function SectionsPanel({ id, report }: { id: string; report: Row }) {
  const locations = useLocations(report.project_id);
  const [editingId, setEditingId] = useState<string>();
  const sections: Row[] = report.sections ?? [];

  const create = useApiMutation((body: Record<string, unknown>) =>
    api(`/reports/${id}/sections`, { method: "POST", body }),
  );
  const update = useApiMutation(({ sectionId, body }: { sectionId: string; body: Record<string, unknown> }) =>
    api(`/reports/${id}/sections/${sectionId}`, { method: "PATCH", body }),
  );
  const remove = useApiMutation((sectionId: string) => api(`/reports/${id}/sections/${sectionId}`, { method: "DELETE" }));

  const sectionOptions = sections.map((section) => ({
    value: section.id,
    label: `${section.display_order}. ${section.heading ?? section.section_type}`,
  }));
  const locationOptions = (locations.data ?? []).map((location) => ({ value: location.location_id, label: location.full_path }));
  const headingOf = (sectionId?: string | null) => sections.find((section) => section.id === sectionId)?.heading;
  const editing = sections.find((section) => section.id === editingId);

  function submitCreate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    create.mutate(readForm(form), { onSuccess: () => form.reset() });
  }

  function submitEdit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!editing) return;
    const changed = Object.fromEntries(
      Object.entries(readForm(event.currentTarget)).filter(([key, value]) => value !== (editing[key] ?? null)),
    );
    update.mutate({ sectionId: editing.id, body: changed }, { onSuccess: () => setEditingId(undefined) });
  }

  return (
    <Panel
      title="Sections"
      description="/api/reports/:id/sections. Deleting a section deletes its child sections; its observations become unsectioned."
    >
      <ErrorNote error={remove.error} />
      <DataTable
        rows={sections}
        rowKey={(row) => row.id}
        empty="No sections"
        selectedKey={editingId}
        onSelect={(row) => setEditingId(row.id)}
        columns={[
          { key: "display_order", label: "#" },
          { key: "section_type", label: "Type", render: (row) => <Pill value={row.section_type} /> },
          { key: "heading", label: "Heading", render: (row) => (row.parent_section_id ? `↳ ${row.heading ?? ""}` : row.heading) },
          { key: "parent_section_id", label: "Parent", render: (row) => headingOf(row.parent_section_id) },
          { key: "body_text", label: "Body", className: "max-w-sm text-xs" },
          {
            key: "delete",
            label: "",
            render: (row) => (
              <Button
                type="button"
                variant="ghost"
                onClick={(event) => {
                  event.stopPropagation();
                  remove.mutate(row.id);
                }}
              >
                Delete
              </Button>
            ),
          },
        ]}
      />

      {editing && (
        <form onSubmit={submitEdit} className="grid gap-3 rounded-lg border border-teal-200 bg-teal-50/40 p-3 sm:grid-cols-3" key={editing.id + editing.updated_at}>
          <p className="text-sm font-semibold sm:col-span-3">Edit section “{editing.heading ?? editing.section_type}” (changed fields only)</p>
          <SectionFields
            defaults={editing}
            sectionOptions={sectionOptions.filter((option) => option.value !== editing.id)}
            locationOptions={locationOptions}
            nullable
          />
          <div className="flex gap-2 sm:col-span-3">
            <Button type="submit" disabled={update.isPending}>
              Save section
            </Button>
            <Button type="button" variant="secondary" onClick={() => setEditingId(undefined)}>
              Cancel
            </Button>
          </div>
          <div className="sm:col-span-3">
            <ErrorNote error={update.error} />
          </div>
        </form>
      )}

      <form onSubmit={submitCreate} className="grid gap-3 sm:grid-cols-3">
        <p className="text-sm font-semibold sm:col-span-3">Add section</p>
        <SectionFields sectionOptions={sectionOptions} locationOptions={locationOptions} />
        <div className="grid gap-2 sm:col-span-3">
          <ErrorNote error={create.error} />
          <div>
            <Button type="submit" disabled={create.isPending}>
              Add section
            </Button>
          </div>
        </div>
      </form>
    </Panel>
  );
}

function SectionFields({
  defaults,
  sectionOptions,
  locationOptions,
  nullable = false,
}: {
  defaults?: Row;
  sectionOptions: { value: string; label: string }[];
  locationOptions: { value: string; label: string }[];
  nullable?: boolean;
}) {
  const nullProps = nullable ? { "data-nullable": "" } : {};
  return (
    <>
      <Field label="Type">
        <Select name="section_type" required defaultValue={defaults?.section_type ?? ""}>
          <Options placeholder="Choose type" items={enumOptions(REPORT_SECTION_TYPES)} />
        </Select>
      </Field>
      <Field label="Heading">
        <Input name="heading" defaultValue={defaults?.heading ?? ""} {...nullProps} />
      </Field>
      <Field label="Display order (blank = append)">
        <Input name="display_order" type="number" min={1} data-kind="number" defaultValue={defaults?.display_order ?? ""} />
      </Field>
      <Field label="Parent section">
        <Select name="parent_section_id" defaultValue={defaults?.parent_section_id ?? ""} {...nullProps}>
          <Options placeholder="(top level)" items={sectionOptions} />
        </Select>
      </Field>
      <Field label="Site location (LOCATION sections)">
        <Select name="site_location_id" defaultValue={defaults?.site_location_id ?? ""} {...nullProps}>
          <Options placeholder="(none)" items={locationOptions} />
        </Select>
      </Field>
      <Field label="Body text">
        <Textarea name="body_text" defaultValue={defaults?.body_text ?? ""} rows={2} className="min-h-11" {...nullProps} />
      </Field>
    </>
  );
}

function ObservationsPanel({ id, report }: { id: string; report: Row }) {
  const observations: Row[] = report.observations ?? [];
  const sectionOptions = (report.sections ?? []).map((section: Row) => ({
    value: section.id,
    label: `${section.display_order}. ${section.heading ?? section.section_type}`,
  }));

  const path = (issueId: string) => `/reports/${id}/issues/${issueId}`;
  const update = useApiMutation(({ issueId, body }: { issueId: string; body: Record<string, unknown> }) =>
    api(path(issueId), { method: "PATCH", body }),
  );
  const remove = useApiMutation((issueId: string) => api(path(issueId), { method: "DELETE" }));
  const renumber = useApiMutation(() => api(`/reports/${id}/renumber`, { method: "POST" }));
  const move = useApiMutation(async ({ a, b }: { a: Row; b: Row }) => {
    // display_order is unique per report, so swap through a temporary slot.
    const temp = Math.max(...observations.map((row) => row.observation_display_order)) + 1;
    await api(path(a.issue_id), { method: "PATCH", body: { display_order: temp } });
    await api(path(b.issue_id), { method: "PATCH", body: { display_order: a.observation_display_order } });
    return api(path(a.issue_id), { method: "PATCH", body: { display_order: b.observation_display_order } });
  });

  const error = update.error ?? remove.error ?? renumber.error ?? move.error;

  return (
    <Panel
      title={`Observations · ${observations.length}`}
      description="/api/reports/:id/issues. Numbers are auto-assigned on add; Renumber orders them by section, then position."
      actions={
        <Button type="button" variant="secondary" disabled={renumber.isPending} onClick={() => renumber.mutate()}>
          Renumber observations
        </Button>
      }
    >
      <ErrorNote error={error} />
      <DataTable
        rows={observations}
        rowKey={(row) => row.issue_id}
        empty="No observations yet (submit will fail)"
        columns={[
          { key: "observation_no", label: "Obs #", className: "font-mono" },
          { key: "observation_display_order", label: "Pos", className: "font-mono text-xs" },
          {
            key: "issue_title",
            label: "Issue",
            render: (row) => (
              <Link href={`/test/issues/${row.issue_id}`} className="text-teal-800 hover:underline">
                {row.issue_title}
              </Link>
            ),
          },
          { key: "location_path", label: "Location", className: "text-xs" },
          { key: "severity", label: "Severity", render: (row) => <Pill value={row.severity} /> },
          { key: "issue_status", label: "Status", render: (row) => <Pill value={row.issue_status} /> },
          {
            key: "section_id",
            label: "Section",
            render: (row) => (
              <Select
                value={row.section_id ?? ""}
                onChange={(event) =>
                  update.mutate({ issueId: row.issue_id, body: { section_id: event.target.value || null } })
                }
                className="min-h-8 w-52 text-xs"
              >
                <Options placeholder="(no section)" items={sectionOptions} />
              </Select>
            ),
          },
          {
            key: "actions",
            label: "",
            render: (row) => {
              const index = observations.indexOf(row);
              return (
                <div className="flex gap-1">
                  <IconButton
                    label="Move up"
                    disabled={index === 0 || move.isPending}
                    onClick={() => move.mutate({ a: row, b: observations[index - 1] })}
                  >
                    ↑
                  </IconButton>
                  <IconButton
                    label="Move down"
                    disabled={index === observations.length - 1 || move.isPending}
                    onClick={() => move.mutate({ a: row, b: observations[index + 1] })}
                  >
                    ↓
                  </IconButton>
                  <IconButton label="Remove from report" onClick={() => remove.mutate(row.issue_id)}>
                    ✕
                  </IconButton>
                </div>
              );
            },
          },
        ]}
      />
      <AddObservation id={id} report={report} sectionOptions={sectionOptions} />
    </Panel>
  );
}

function AddObservation({
  id,
  report,
  sectionOptions,
}: {
  id: string;
  report: Row;
  sectionOptions: { value: string; label: string }[];
}) {
  const [q, setQ] = useState("");
  const [samePackage, setSamePackage] = useState(true);
  const [anyProject, setAnyProject] = useState(false);
  const [sectionId, setSectionId] = useState("");

  const candidates = useQuery({
    queryKey: ["candidates", id, q, samePackage, anyProject],
    queryFn: () =>
      api<Page>(
        `/issues${query({
          not_in_report: id,
          project_id: anyProject ? undefined : report.project_id,
          package_id: samePackage && !anyProject ? report.package_id : undefined,
          q,
          limit: "15",
        })}`,
      ),
    staleTime: 0,
  });

  const add = useApiMutation((issueId: string) =>
    api(`/reports/${id}/issues`, { method: "POST", body: { issue_id: issueId, section_id: sectionId || null } }),
  );

  return (
    <div className="grid gap-3 rounded-lg border border-slate-200 p-3">
      <p className="text-sm font-semibold">Add an observation (issues not already in this report)</p>
      <div className="flex flex-wrap items-end gap-3">
        <Field label="Search">
          <Input value={q} onChange={(event) => setQ(event.target.value)} placeholder="title, text, location" />
        </Field>
        <Field label="Into section">
          <Select value={sectionId} onChange={(event) => setSectionId(event.target.value)} className="w-64">
            <Options placeholder="(no section)" items={sectionOptions} />
          </Select>
        </Field>
        {report.package_id && (
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={samePackage} onChange={(event) => setSamePackage(event.target.checked)} />
            Only {report.package_code} package
          </label>
        )}
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={anyProject} onChange={(event) => setAnyProject(event.target.checked)} />
          Include other projects (should be rejected)
        </label>
      </div>
      <ErrorNote error={candidates.error ?? add.error} />
      <DataTable
        rows={candidates.data?.items}
        rowKey={(row) => row.issue_id}
        empty="No candidate issues"
        columns={[
          { key: "title", label: "Issue" },
          { key: "project_code", label: "Project", className: "font-mono text-xs" },
          { key: "package_code", label: "Pkg", className: "font-mono text-xs" },
          { key: "location_path", label: "Location", className: "text-xs" },
          { key: "severity", label: "Severity", render: (row) => <Pill value={row.severity} /> },
          { key: "status", label: "Status", render: (row) => <Pill value={row.status} /> },
          {
            key: "add",
            label: "",
            render: (row) => (
              <Button type="button" variant="secondary" disabled={add.isPending} onClick={() => add.mutate(row.issue_id)}>
                Add
              </Button>
            ),
          },
        ]}
      />
    </div>
  );
}

function PayloadPanel({ id }: { id: string }) {
  const [enabled, setEnabled] = useState(false);
  const payload = useQuery({
    queryKey: ["payload", id],
    queryFn: () => api(`/reports/${id}/payload`),
    enabled,
    staleTime: 0,
  });
  return (
    <Panel
      title="Generation payload"
      description="GET /api/reports/:id/payload (fn_report_payload): the JSON a document generator would consume."
      actions={
        <Button type="button" variant="secondary" onClick={() => (enabled ? payload.refetch() : setEnabled(true))}>
          {enabled ? "Refresh" : "Load payload"}
        </Button>
      }
    >
      <ErrorNote error={payload.error} />
      {payload.data !== undefined && <JsonView value={payload.data} label="Payload" open />}
    </Panel>
  );
}

function IconButton({
  label,
  children,
  ...props
}: { label: string; children: ReactNode } & Omit<ButtonHTMLAttributes<HTMLButtonElement>, "children">) {
  return (
    <button
      type="button"
      title={label}
      aria-label={label}
      className="rounded-md border border-slate-200 px-2 py-1 text-xs hover:bg-slate-100 disabled:opacity-40"
      {...props}
    >
      {children}
    </button>
  );
}

function Detail({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div>
      <dt className="text-xs text-slate-500">{label}</dt>
      <dd>{value || "—"}</dd>
    </div>
  );
}
