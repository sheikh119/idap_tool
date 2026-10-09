"use client";

import { useQuery } from "@tanstack/react-query";
import { useState, type FormEvent } from "react";
import { Button, Field, Input, PageHeader, Select, Textarea } from "@/components/ui";
import { DB_ISSUE_SEVERITIES } from "@/lib/db/enums";
import { DataTable, ErrorNote, JsonView, Options, Panel, Pill, SuccessNote, enumOptions } from "../_components/kit";
import { api, readForm } from "../_lib/client";
import { useApiMutation, useCategories, useGenericIssues, type Row } from "../_lib/queries";

export default function CataloguePage() {
  const categories = useCategories();
  const [categoryId, setCategoryId] = useState("");
  const [parentId, setParentId] = useState("");
  const [active, setActive] = useState("");
  const [q, setQ] = useState("");
  const [selectedId, setSelectedId] = useState<string>();

  const genericIssues = useGenericIssues({ category_id: categoryId, parent_id: parentId, active, q });
  const allTopLevel = useGenericIssues({ parent_id: "none" });

  const createCategory = useApiMutation((body: Record<string, unknown>) =>
    api("/catalogue/categories", { method: "POST", body }),
  );
  const updateCategory = useApiMutation(({ id, body }: { id: string; body: Record<string, unknown> }) =>
    api(`/catalogue/categories/${id}`, { method: "PATCH", body }),
  );
  const createIssue = useApiMutation((body: Record<string, unknown>) =>
    api("/catalogue/generic-issues", { method: "POST", body }),
  );

  const categoryOptions = (categories.data ?? []).map((category) => ({
    value: category.id,
    label: `${category.code} · ${category.name}`,
  }));
  const parentOptions = (allTopLevel.data ?? []).map((issue) => ({ value: issue.id, label: `${issue.issue_code} · ${issue.title}` }));

  function submit(mutation: typeof createCategory) {
    return (event: FormEvent<HTMLFormElement>) => {
      event.preventDefault();
      const form = event.currentTarget;
      mutation.mutate(readForm(form), { onSuccess: () => form.reset() });
    };
  }

  return (
    <>
      <PageHeader
        title="Generic issue catalogue"
        description="Issues created from a template copy its text and severity (snapshot); editing the template later does not change them."
      />

      <Panel title="Categories" description="/api/catalogue/categories">
        <ErrorNote error={categories.error ?? updateCategory.error} />
        <DataTable
          rows={categories.data}
          rowKey={(row) => row.id}
          columns={[
            { key: "code", label: "Code", className: "font-mono text-xs" },
            { key: "name", label: "Name" },
            { key: "generic_issues", label: "Templates", render: (row) => row.generic_issues?.[0]?.count ?? 0 },
            {
              key: "is_active",
              label: "Active",
              render: (row) => (
                <Button variant="ghost" onClick={() => updateCategory.mutate({ id: row.id, body: { is_active: !row.is_active } })}>
                  <Pill value={row.is_active} />
                </Button>
              ),
            },
          ]}
        />
        <form onSubmit={submit(createCategory)} className="flex flex-wrap items-end gap-2">
          <Field label="Code">
            <Input name="code" required className="w-28" />
          </Field>
          <Field label="Name">
            <Input name="name" required />
          </Field>
          <Field label="Description">
            <Input name="description" />
          </Field>
          <Button type="submit" disabled={createCategory.isPending}>
            Add category
          </Button>
        </form>
        <ErrorNote error={createCategory.error} />
      </Panel>

      <Panel
        title="Generic issues"
        description="GET /api/catalogue/generic-issues"
        actions={
          <div className="flex flex-wrap gap-2">
            <Input placeholder="Search title/code" value={q} onChange={(event) => setQ(event.target.value)} className="w-44" />
            <Select value={categoryId} onChange={(event) => setCategoryId(event.target.value)} className="w-44">
              <Options placeholder="All categories" items={categoryOptions} />
            </Select>
            <Select value={parentId} onChange={(event) => setParentId(event.target.value)} className="w-44">
              <option value="">Any level</option>
              <option value="none">Top level only</option>
              {parentOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  Children of {option.label}
                </option>
              ))}
            </Select>
            <Select value={active} onChange={(event) => setActive(event.target.value)} className="w-36">
              <option value="">Active + retired</option>
              <option value="true">Active</option>
              <option value="false">Retired</option>
            </Select>
          </div>
        }
      >
        <ErrorNote error={genericIssues.error} />
        <DataTable
          rows={genericIssues.data}
          rowKey={(row) => row.id}
          selectedKey={selectedId}
          onSelect={(row) => setSelectedId(row.id)}
          columns={[
            { key: "issue_code", label: "Code", className: "font-mono text-xs" },
            { key: "title", label: "Title" },
            { key: "category", label: "Category", render: (row) => row.category?.code },
            { key: "default_severity", label: "Severity", render: (row) => <Pill value={row.default_severity} /> },
            { key: "parent_issue_id", label: "Child?", render: (row) => (row.parent_issue_id ? "child" : "") },
            { key: "is_active", label: "Active", render: (row) => <Pill value={row.is_active} /> },
          ]}
        />
      </Panel>

      {selectedId && <GenericIssueDetail key={selectedId} id={selectedId} categoryOptions={categoryOptions} />}

      <Panel title="Create generic issue" description="POST /api/catalogue/generic-issues">
        <form onSubmit={submit(createIssue)} className="grid gap-3 sm:grid-cols-3">
          <Field label="Category">
            <Select name="category_id" required defaultValue="">
              <Options placeholder="Choose category" items={categoryOptions} />
            </Select>
          </Field>
          <Field label="Parent (must be same category)">
            <Select name="parent_issue_id" defaultValue="">
              <Options placeholder="(top level)" items={parentOptions} />
            </Select>
          </Field>
          <Field label="Code">
            <Input name="issue_code" required />
          </Field>
          <Field label="Title">
            <Input name="title" required />
          </Field>
          <Field label="Default severity">
            <Select name="default_severity" defaultValue="">
              <Options placeholder="(none)" items={enumOptions(DB_ISSUE_SEVERITIES)} />
            </Select>
          </Field>
          <div />
          <Field label="Default description">
            <Textarea name="default_description" required />
          </Field>
          <Field label="Default root cause">
            <Textarea name="default_root_cause" />
          </Field>
          <Field label="Default risk text">
            <Textarea name="default_risk_text" />
          </Field>
          <div className="grid gap-2 sm:col-span-3">
            <ErrorNote error={createIssue.error} />
            {createIssue.isSuccess && <SuccessNote>Created {createIssue.data?.issue_code}</SuccessNote>}
            <div>
              <Button type="submit" disabled={createIssue.isPending}>
                Create template
              </Button>
            </div>
          </div>
        </form>
      </Panel>
    </>
  );
}

function GenericIssueDetail({ id, categoryOptions }: { id: string; categoryOptions: { value: string; label: string }[] }) {
  const detail = useQuery({
    queryKey: ["generic-issue", id],
    queryFn: () => api<Row>(`/catalogue/generic-issues/${id}`),
    staleTime: 0,
  });
  const update = useApiMutation((body: Record<string, unknown>) =>
    api(`/catalogue/generic-issues/${id}`, { method: "PATCH", body }),
  );

  if (detail.error) return <ErrorNote error={detail.error} />;
  if (!detail.data) return null;
  const data = detail.data;

  function submitUpdate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    update.mutate(readForm(event.currentTarget));
  }

  return (
    <Panel title={`${data.issue_code} · ${data.title}`} description={`PATCH /api/catalogue/generic-issues/${id}`}>
      <form onSubmit={submitUpdate} className="grid gap-3 sm:grid-cols-3">
        <Field label="Title">
          <Input name="title" defaultValue={data.title} />
        </Field>
        <Field label="Category">
          <Select name="category_id" defaultValue={data.category_id}>
            <Options items={categoryOptions} />
          </Select>
        </Field>
        <Field label="Default severity">
          <Select name="default_severity" defaultValue={data.default_severity ?? ""} data-nullable>
            <Options placeholder="(none)" items={enumOptions(DB_ISSUE_SEVERITIES)} />
          </Select>
        </Field>
        <Field label="Default description">
          <Textarea name="default_description" defaultValue={data.default_description} />
        </Field>
        <Field label="Default root cause">
          <Textarea name="default_root_cause" defaultValue={data.default_root_cause ?? ""} data-nullable />
        </Field>
        <Field label="Default risk text">
          <Textarea name="default_risk_text" defaultValue={data.default_risk_text ?? ""} data-nullable />
        </Field>
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" name="is_active" defaultChecked={data.is_active} /> Active (retired templates cannot be used for new issues)
        </label>
        <div className="grid gap-2 sm:col-span-3">
          <ErrorNote error={update.error} />
          {update.isSuccess && <SuccessNote>Saved</SuccessNote>}
          <div>
            <Button type="submit" disabled={update.isPending}>
              Save template
            </Button>
          </div>
        </div>
      </form>
      {data.children?.length > 0 && (
        <DataTable
          rows={data.children}
          rowKey={(row) => row.id}
          columns={[
            { key: "issue_code", label: "Child code", className: "font-mono text-xs" },
            { key: "title", label: "Title" },
            { key: "is_active", label: "Active", render: (row) => <Pill value={row.is_active} /> },
          ]}
        />
      )}
      <JsonView value={data} />
    </Panel>
  );
}
