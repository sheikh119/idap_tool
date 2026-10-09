"use client";

import { useQuery } from "@tanstack/react-query";
import { useState, type FormEvent } from "react";
import { Button, Field, Input, PageHeader, Select } from "@/components/ui";
import { ROLE_NAMES } from "@/lib/db/enums";
import { DataTable, ErrorNote, JsonView, Options, Panel, Pill, SuccessNote, enumOptions } from "../_components/kit";
import { api, query, readForm, setActorId } from "../_lib/client";
import { useApiMutation, useProjects, type Row } from "../_lib/queries";

export default function UsersPage() {
  const [role, setRole] = useState("");
  const [active, setActive] = useState("");
  const [selectedId, setSelectedId] = useState<string>();

  const users = useQuery({
    queryKey: ["users", "filtered", role, active],
    queryFn: () => api<Row[]>(`/users${query({ role, active })}`),
    staleTime: 0,
  });

  const create = useApiMutation((body: Record<string, unknown>) => api("/users", { method: "POST", body }));

  function submitCreate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    create.mutate(readForm(form), { onSuccess: () => form.reset() });
  }

  return (
    <>
      <PageHeader title="Users & project access" description="GET/POST /api/users · PATCH /api/users/:id · /api/users/:id/projects" />

      <Panel
        title="Users"
        actions={
          <div className="flex gap-2">
            <Select value={role} onChange={(event) => setRole(event.target.value)}>
              <Options placeholder="All roles" items={enumOptions(ROLE_NAMES)} />
            </Select>
            <Select value={active} onChange={(event) => setActive(event.target.value)}>
              <option value="">Active + inactive</option>
              <option value="true">Active only</option>
              <option value="false">Inactive only</option>
            </Select>
          </div>
        }
      >
        <ErrorNote error={users.error} />
        <DataTable
          rows={users.data}
          rowKey={(row) => row.id}
          selectedKey={selectedId}
          onSelect={(row) => setSelectedId(row.id)}
          columns={[
            { key: "name", label: "Name" },
            { key: "email", label: "Email" },
            { key: "employee_id", label: "Employee id" },
            { key: "role_name", label: "Role", render: (row) => <Pill value={row.role_name} /> },
            { key: "is_active", label: "Active", render: (row) => <Pill value={row.is_active} /> },
          ]}
        />
      </Panel>

      {selectedId && <UserDetail key={selectedId} id={selectedId} />}

      <Panel title="Create user" description="POST /api/users">
        <form onSubmit={submitCreate} className="grid gap-3 sm:grid-cols-2">
          <Field label="Name">
            <Input name="name" required />
          </Field>
          <Field label="Email">
            <Input name="email" type="email" />
          </Field>
          <Field label="Employee id">
            <Input name="employee_id" />
          </Field>
          <Field label="Department (default QC)">
            <Input name="department" />
          </Field>
          <Field label="Role">
            <Select name="role_name" required defaultValue="">
              <Options placeholder="Choose role" items={enumOptions(ROLE_NAMES)} />
            </Select>
          </Field>
          <label className="flex items-center gap-2 self-end text-sm">
            <input type="checkbox" name="is_active" defaultChecked /> Active
          </label>
          <div className="grid gap-2 sm:col-span-2">
            <ErrorNote error={create.error} />
            {create.isSuccess && <SuccessNote>Created {create.data?.name}</SuccessNote>}
            <div>
              <Button type="submit" disabled={create.isPending}>
                Create user
              </Button>
            </div>
          </div>
        </form>
      </Panel>
    </>
  );
}

function UserDetail({ id }: { id: string }) {
  const user = useQuery({ queryKey: ["user", id], queryFn: () => api<Row>(`/users/${id}`), staleTime: 0 });
  const projects = useProjects();

  const update = useApiMutation((body: Record<string, unknown>) => api(`/users/${id}`, { method: "PATCH", body }));
  const assign = useApiMutation((body: { project_id: string; is_active: boolean }) =>
    api(`/users/${id}/projects`, { method: "POST", body }),
  );

  if (user.error) return <ErrorNote error={user.error} />;
  if (!user.data) return null;
  const data = user.data;

  function submitUpdate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    update.mutate(readForm(event.currentTarget));
  }

  function submitAssign(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const body = readForm(event.currentTarget) as { project_id: string };
    assign.mutate({ project_id: body.project_id, is_active: true });
  }

  return (
    <Panel
      title={`${data.name}`}
      description={data.id}
      actions={
        <Button variant="secondary" onClick={() => setActorId(data.id)}>
          Act as this user
        </Button>
      }
    >
      <form onSubmit={submitUpdate} className="grid gap-3 sm:grid-cols-3">
        <Field label="Name">
          <Input name="name" defaultValue={data.name} />
        </Field>
        <Field label="Email">
          <Input name="email" type="email" defaultValue={data.email ?? ""} data-nullable />
        </Field>
        <Field label="Role">
          <Select name="role_name" defaultValue={data.role_name}>
            <Options items={enumOptions(ROLE_NAMES)} />
          </Select>
        </Field>
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" name="is_active" defaultChecked={data.is_active} /> Active
        </label>
        <div className="grid gap-2 sm:col-span-3">
          <ErrorNote error={update.error} />
          {update.isSuccess && <SuccessNote>Saved</SuccessNote>}
          <div>
            <Button type="submit" disabled={update.isPending}>
              Save (PATCH)
            </Button>
          </div>
        </div>
      </form>

      <h3 className="text-sm font-semibold">Project assignments</h3>
      <DataTable
        rows={data.projects}
        rowKey={(row) => row.project_id}
        empty="Not assigned to any project"
        columns={[
          { key: "project_code", label: "Project" },
          { key: "project_name", label: "Name" },
          { key: "project_status", label: "Status", render: (row) => <Pill value={row.project_status} /> },
          { key: "assignment_is_active", label: "Assignment", render: (row) => <Pill value={row.assignment_is_active} /> },
          {
            key: "toggle",
            label: "",
            render: (row) => (
              <Button
                variant="ghost"
                onClick={() => assign.mutate({ project_id: row.project_id, is_active: !row.assignment_is_active })}
              >
                {row.assignment_is_active ? "Disable" : "Enable"}
              </Button>
            ),
          },
        ]}
      />
      <form onSubmit={submitAssign} className="flex flex-wrap items-end gap-2">
        <Field label="Assign to project">
          <Select name="project_id" required defaultValue="">
            <Options
              placeholder="Choose project"
              items={(projects.data ?? []).map((project) => ({ value: project.id, label: `${project.project_code} · ${project.name}` }))}
            />
          </Select>
        </Field>
        <Button type="submit" disabled={assign.isPending}>
          Assign
        </Button>
      </form>
      <ErrorNote error={assign.error} />
      <JsonView value={data} />
    </Panel>
  );
}
