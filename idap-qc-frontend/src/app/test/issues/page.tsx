"use client";

import { keepPreviousData, useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { useState, type FormEvent } from "react";
import { Button, Field, Input, PageHeader, Select, Textarea } from "@/components/ui";
import { DB_ISSUE_SEVERITIES } from "@/lib/db/enums";
import { IssueFilters, type Filters } from "../_components/filters";
import { DataTable, ErrorNote, Options, Panel, Pill, SuccessNote, enumOptions, formatDate } from "../_components/kit";
import { api, query, readForm, useActorId } from "../_lib/client";
import { useApiMutation, useGenericIssues, useLocations, useProjects, type Page, type Row } from "../_lib/queries";

const PAGE_SIZE = 10;

export default function IssuesPage() {
  const [filters, setFilters] = useState<Filters>({});
  const [offset, setOffset] = useState(0);

  const issues = useQuery({
    queryKey: ["issues", filters, offset],
    queryFn: () => api<Page>(`/issues${query({ ...filters, limit: String(PAGE_SIZE), offset: String(offset) })}`),
    placeholderData: keepPreviousData,
    staleTime: 0,
  });

  const total = issues.data?.total ?? 0;

  return (
    <>
      <PageHeader title="Issues" description="GET /api/issues (v_issue_details) · POST /api/issues" />

      <Panel title="Filters">
        <IssueFilters
          value={filters}
          onChange={(next) => {
            setFilters(next);
            setOffset(0);
          }}
        />
      </Panel>

      <Panel
        title={`Issues · ${total} total`}
        description="Click a row for detail, status changes and history."
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
        <ErrorNote error={issues.error} />
        <DataTable
          rows={issues.data?.items}
          rowKey={(row) => row.issue_id}
          empty="No issues match"
          columns={[
            {
              key: "title",
              label: "Title",
              render: (row) => (
                <Link href={`/test/issues/${row.issue_id}`} className="font-medium text-teal-800 hover:underline">
                  {row.title}
                </Link>
              ),
            },
            { key: "project_code", label: "Project", className: "font-mono text-xs" },
            { key: "location_path", label: "Location" },
            { key: "generic_issue_code", label: "Template", className: "font-mono text-xs" },
            { key: "severity", label: "Severity", render: (row) => <Pill value={row.severity} /> },
            { key: "status", label: "Status", render: (row) => <Pill value={row.status} /> },
            { key: "reporter_name", label: "Reporter" },
            { key: "observed_at", label: "Observed", render: (row) => formatDate(row.observed_at) },
          ]}
        />
      </Panel>

      <CreateIssuePanel />
    </>
  );
}

function CreateIssuePanel() {
  const actorId = useActorId();
  const projects = useProjects();
  const [projectId, setProjectId] = useState("");
  const [genericId, setGenericId] = useState("");
  const locations = useLocations(projectId || undefined);
  const genericIssues = useGenericIssues({ active: "true" });
  const template = genericIssues.data?.find((issue) => issue.id === genericId);

  const create = useApiMutation((body: Record<string, unknown>) => api<Row>("/issues", { method: "POST", body }));

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const body = readForm(form);
    delete body.project_id;
    create.mutate(body, {
      onSuccess: () => {
        form.reset();
        setGenericId("");
      },
    });
  }

  function copyTemplate(form: HTMLFormElement | null) {
    if (!form || !template) return;
    const set = (name: string, value: string | null) => {
      const field = form.elements.namedItem(name) as HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement | null;
      if (field) field.value = value ?? "";
    };
    set("title", template.title);
    set("description", template.default_description);
    set("root_cause", template.default_root_cause);
    set("risk_description", template.default_risk_text);
    set("severity", template.default_severity);
  }

  return (
    <Panel
      title="Report a new issue"
      description="Pick a generic issue and leave the text blank to let the DB snapshot fill it, or write a freehand issue. Requires an acting user with project access."
    >
      {!actorId && <p className="text-sm text-amber-700">Select an acting user in the sidebar first (otherwise 401).</p>}
      <form onSubmit={submit} className="grid gap-3 sm:grid-cols-3">
        <Field label="Project (filters locations only)">
          <Select name="project_id" value={projectId} onChange={(event) => setProjectId(event.target.value)}>
            <Options
              placeholder="Choose project"
              items={(projects.data ?? []).map((project) => ({ value: project.id, label: `${project.project_code} · ${project.name}` }))}
            />
          </Select>
        </Field>
        <Field label="Site location">
          <Select name="site_location_id" required defaultValue="" key={projectId}>
            <Options
              placeholder={projectId ? "Choose location" : "Choose a project first"}
              items={(locations.data ?? []).map((location) => ({
                value: location.location_id,
                label: `${location.full_path}${location.is_active ? "" : " (archived)"}`,
              }))}
            />
          </Select>
        </Field>
        <Field label="Generic issue (optional)">
          <Select name="generic_issue_id" value={genericId} onChange={(event) => setGenericId(event.target.value)}>
            <Options
              placeholder="(freehand)"
              items={(genericIssues.data ?? []).map((issue) => ({ value: issue.id, label: `${issue.issue_code} · ${issue.title}` }))}
            />
          </Select>
        </Field>
        {template && (
          <div className="flex flex-wrap items-center gap-2 text-xs text-slate-600 sm:col-span-3">
            Template severity: <Pill value={template.default_severity} />
            <Button type="button" variant="secondary" onClick={(event) => copyTemplate(event.currentTarget.form)}>
              Copy template text into the form
            </Button>
          </div>
        )}
        <Field label={genericId ? "Title (blank = from template)" : "Title"}>
          <Input name="title" required={!genericId} />
        </Field>
        <Field label="Severity">
          <Select name="severity" defaultValue="">
            <Options placeholder={genericId ? "(from template)" : "(DB default)"} items={enumOptions(DB_ISSUE_SEVERITIES)} />
          </Select>
        </Field>
        <Field label="Observed at">
          <Input name="observed_at" type="datetime-local" />
        </Field>
        <Field label={genericId ? "Description (blank = from template)" : "Description"}>
          <Textarea name="description" required={!genericId} />
        </Field>
        <Field label="Root cause">
          <Textarea name="root_cause" />
        </Field>
        <Field label="Risk">
          <Textarea name="risk_description" />
        </Field>
        <Field label="Location details">
          <Input name="location_details" placeholder="Grid C/12, east face" />
        </Field>
        <div className="grid gap-2 sm:col-span-3">
          <ErrorNote error={create.error} />
          {create.isSuccess && (
            <SuccessNote>
              Created{" "}
              <Link href={`/test/issues/${create.data.issue_id}`} className="font-semibold underline">
                {create.data.title}
              </Link>{" "}
              ({create.data.severity})
            </SuccessNote>
          )}
          <div>
            <Button type="submit" disabled={create.isPending}>
              Create issue
            </Button>
          </div>
        </div>
      </form>
    </Panel>
  );
}
