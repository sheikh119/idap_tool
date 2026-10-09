"use client";

import { useQuery } from "@tanstack/react-query";
import { useState, type FormEvent } from "react";
import { Button, Field, Input, PageHeader, Select, Textarea } from "@/components/ui";
import { LOCATION_TYPES, PACKAGE_STATUSES, PROJECT_STATUSES } from "@/lib/db/enums";
import { DataTable, ErrorNote, JsonView, Options, Panel, Pill, SuccessNote, enumOptions } from "../_components/kit";
import { api, readForm } from "../_lib/client";
import { useApiMutation, useLocations, usePackages, useProjects, type Row } from "../_lib/queries";

export default function ProjectsPage() {
  const projects = useProjects();
  const [selectedId, setSelectedId] = useState<string>();
  const create = useApiMutation((body: Record<string, unknown>) => api("/projects", { method: "POST", body }));

  function submitCreate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    create.mutate(readForm(form), { onSuccess: () => form.reset() });
  }

  return (
    <>
      <PageHeader title="Projects, packages & locations" description="Click a project to manage its packages, location tree and members." />

      <Panel title="Projects" description="GET /api/projects">
        <ErrorNote error={projects.error} />
        <DataTable
          rows={projects.data}
          rowKey={(row) => row.id}
          selectedKey={selectedId}
          onSelect={(row) => setSelectedId(row.id)}
          columns={[
            { key: "project_code", label: "Code", className: "font-mono text-xs" },
            { key: "name", label: "Name" },
            { key: "status", label: "Status", render: (row) => <Pill value={row.status} /> },
            { key: "packages", label: "Packages", render: (row) => row.packages?.[0]?.count ?? 0 },
            { key: "start_date", label: "Start" },
            { key: "end_date", label: "End" },
            { key: "is_active", label: "Active", render: (row) => <Pill value={row.is_active} /> },
          ]}
        />
      </Panel>

      {selectedId && <ProjectDetail key={selectedId} id={selectedId} />}

      <Panel title="Create project" description="POST /api/projects">
        <form onSubmit={submitCreate} className="grid gap-3 sm:grid-cols-3">
          <Field label="Code">
            <Input name="project_code" required placeholder="LHR-PARK" />
          </Field>
          <Field label="Name">
            <Input name="name" required />
          </Field>
          <Field label="Status">
            <Select name="status" defaultValue="">
              <Options placeholder="(DB default)" items={enumOptions(PROJECT_STATUSES)} />
            </Select>
          </Field>
          <Field label="Start date">
            <Input name="start_date" type="date" />
          </Field>
          <Field label="End date">
            <Input name="end_date" type="date" />
          </Field>
          <Field label="Description">
            <Input name="description" />
          </Field>
          <div className="grid gap-2 sm:col-span-3">
            <ErrorNote error={create.error} />
            {create.isSuccess && <SuccessNote>Created {create.data?.project_code}</SuccessNote>}
            <div>
              <Button type="submit" disabled={create.isPending}>
                Create project
              </Button>
            </div>
          </div>
        </form>
      </Panel>
    </>
  );
}

function ProjectDetail({ id }: { id: string }) {
  const project = useQuery({ queryKey: ["project", id], queryFn: () => api<Row>(`/projects/${id}`), staleTime: 0 });
  const update = useApiMutation((body: Record<string, unknown>) => api(`/projects/${id}`, { method: "PATCH", body }));

  if (project.error) return <ErrorNote error={project.error} />;
  if (!project.data) return null;
  const data = project.data;

  function submitUpdate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    update.mutate(readForm(event.currentTarget));
  }

  return (
    <>
      <Panel title={`${data.project_code} · ${data.name}`} description={`PATCH /api/projects/${id}`}>
        <form onSubmit={submitUpdate} className="grid gap-3 sm:grid-cols-3">
          <Field label="Name">
            <Input name="name" defaultValue={data.name} />
          </Field>
          <Field label="Status">
            <Select name="status" defaultValue={data.status}>
              <Options items={enumOptions(PROJECT_STATUSES)} />
            </Select>
          </Field>
          <label className="flex items-center gap-2 self-end text-sm">
            <input type="checkbox" name="is_active" defaultChecked={data.is_active} /> Active
          </label>
          <Field label="Start date">
            <Input name="start_date" type="date" defaultValue={data.start_date ?? ""} data-nullable />
          </Field>
          <Field label="End date (must be ≥ start)">
            <Input name="end_date" type="date" defaultValue={data.end_date ?? ""} data-nullable />
          </Field>
          <Field label="Description">
            <Input name="description" defaultValue={data.description ?? ""} data-nullable />
          </Field>
          <div className="grid gap-2 sm:col-span-3">
            <ErrorNote error={update.error} />
            {update.isSuccess && <SuccessNote>Saved</SuccessNote>}
            <div>
              <Button type="submit" disabled={update.isPending}>
                Save project
              </Button>
            </div>
          </div>
        </form>
      </Panel>
      <PackagesPanel projectId={id} />
      <LocationsPanel projectId={id} />
      <MembersPanel projectId={id} />
    </>
  );
}

function PackagesPanel({ projectId }: { projectId: string }) {
  const packages = usePackages(projectId);
  const create = useApiMutation((body: Record<string, unknown>) =>
    api(`/projects/${projectId}/packages`, { method: "POST", body }),
  );
  const update = useApiMutation(({ id, body }: { id: string; body: Record<string, unknown> }) =>
    api(`/packages/${id}`, { method: "PATCH", body }),
  );

  function submitCreate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    create.mutate(readForm(form), { onSuccess: () => form.reset() });
  }

  return (
    <Panel title="Packages" description={`/api/projects/${projectId}/packages · PATCH /api/packages/:id`}>
      <ErrorNote error={packages.error ?? update.error} />
      <DataTable
        rows={packages.data}
        rowKey={(row) => row.id}
        empty="Project has no packages (project-wide only)"
        columns={[
          { key: "package_code", label: "Code", className: "font-mono text-xs" },
          { key: "name", label: "Name" },
          {
            key: "status",
            label: "Status",
            render: (row) => (
              <Select
                value={row.status}
                onChange={(event) => update.mutate({ id: row.id, body: { status: event.target.value } })}
                className="min-h-8 w-36 text-xs"
              >
                <Options items={enumOptions(PACKAGE_STATUSES)} />
              </Select>
            ),
          },
          {
            key: "is_active",
            label: "Active",
            render: (row) => (
              <Button variant="ghost" onClick={() => update.mutate({ id: row.id, body: { is_active: !row.is_active } })}>
                <Pill value={row.is_active} />
              </Button>
            ),
          },
        ]}
      />
      <form onSubmit={submitCreate} className="flex flex-wrap items-end gap-2">
        <Field label="Code">
          <Input name="package_code" required className="w-28" />
        </Field>
        <Field label="Name">
          <Input name="name" required />
        </Field>
        <Field label="Status">
          <Select name="status" defaultValue="">
            <Options placeholder="(default)" items={enumOptions(PACKAGE_STATUSES)} />
          </Select>
        </Field>
        <Button type="submit" disabled={create.isPending}>
          Add package
        </Button>
      </form>
      <ErrorNote error={create.error} />
    </Panel>
  );
}

function LocationsPanel({ projectId }: { projectId: string }) {
  const locations = useLocations(projectId);
  const packages = usePackages(projectId);
  const create = useApiMutation((body: Record<string, unknown>) =>
    api(`/projects/${projectId}/locations`, { method: "POST", body }),
  );
  const update = useApiMutation(({ id, body }: { id: string; body: Record<string, unknown> }) =>
    api(`/locations/${id}`, { method: "PATCH", body }),
  );

  function submitCreate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    create.mutate(readForm(form), { onSuccess: () => form.reset() });
  }

  const locationOptions = (locations.data ?? []).map((location) => ({ value: location.location_id, label: location.full_path }));
  const packageOptions = (packages.data ?? []).map((pkg) => ({ value: pkg.id, label: `${pkg.package_code} · ${pkg.name}` }));

  return (
    <Panel
      title="Site locations"
      description="Tree shown via v_site_location_hierarchy.full_path. A child must stay in the parent's project; cycles are rejected."
    >
      <ErrorNote error={locations.error ?? update.error} />
      <DataTable
        rows={locations.data}
        rowKey={(row) => row.location_id}
        columns={[
          { key: "full_path", label: "Path" },
          { key: "location_code", label: "Code", className: "font-mono text-xs" },
          { key: "location_type", label: "Type" },
          { key: "package_code", label: "Package" },
          {
            key: "is_active",
            label: "Active",
            render: (row) => (
              <Button variant="ghost" onClick={() => update.mutate({ id: row.location_id, body: { is_active: !row.is_active } })}>
                <Pill value={row.is_active} />
              </Button>
            ),
          },
        ]}
      />
      <form onSubmit={submitCreate} className="grid gap-3 sm:grid-cols-3">
        <Field label="Name">
          <Input name="name" required />
        </Field>
        <Field label="Code">
          <Input name="location_code" />
        </Field>
        <Field label="Type">
          <Select name="location_type" defaultValue="">
            <Options placeholder="(DB default)" items={enumOptions(LOCATION_TYPES)} />
          </Select>
        </Field>
        <Field label="Parent location">
          <Select name="parent_location_id" defaultValue="">
            <Options placeholder="(top level)" items={locationOptions} />
          </Select>
        </Field>
        <Field label="Package">
          <Select name="package_id" defaultValue="">
            <Options placeholder="(project-wide)" items={packageOptions} />
          </Select>
        </Field>
        <Field label="Description">
          <Textarea name="description" className="min-h-11" rows={1} />
        </Field>
        <div className="grid gap-2 sm:col-span-3">
          <ErrorNote error={create.error} />
          {create.isSuccess && <SuccessNote>Created {create.data?.full_path}</SuccessNote>}
          <div>
            <Button type="submit" disabled={create.isPending}>
              Add location
            </Button>
          </div>
        </div>
      </form>
    </Panel>
  );
}

function MembersPanel({ projectId }: { projectId: string }) {
  const members = useQuery({
    queryKey: ["members", projectId],
    queryFn: () => api<Row[]>(`/projects/${projectId}/members`),
    staleTime: 0,
  });
  return (
    <Panel title="Members" description={`GET /api/projects/${projectId}/members (assign from the Users page)`}>
      <ErrorNote error={members.error} />
      <DataTable
        rows={members.data}
        rowKey={(row) => row.user_id}
        empty="Nobody assigned"
        columns={[
          { key: "user_name", label: "User" },
          { key: "role_name", label: "Role", render: (row) => <Pill value={row.role_name} /> },
          { key: "user_is_active", label: "User active", render: (row) => <Pill value={row.user_is_active} /> },
          { key: "assignment_is_active", label: "Assignment", render: (row) => <Pill value={row.assignment_is_active} /> },
        ]}
      />
      <JsonView value={members.data} />
    </Panel>
  );
}
