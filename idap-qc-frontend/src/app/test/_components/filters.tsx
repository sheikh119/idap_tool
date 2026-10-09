"use client";

import { Button, Field, Input, Select } from "@/components/ui";
import { DB_ISSUE_SEVERITIES, DB_ISSUE_STATUSES } from "@/lib/db/enums";
import { useCategories, useLocations, usePackages, useProjects, useUsers } from "../_lib/queries";
import { Options, enumOptions } from "./kit";

export type Filters = Record<string, string>;

/** Filter bar shared by the issues list and the dashboard. Every key maps 1:1 to a query param. */
export function IssueFilters({
  value,
  onChange,
  search = true,
}: {
  value: Filters;
  onChange: (next: Filters) => void;
  search?: boolean;
}) {
  const projects = useProjects();
  const packages = usePackages(value.project_id || undefined);
  const locations = useLocations(value.project_id || undefined);
  const categories = useCategories();
  const users = useUsers();

  const set = (key: string, next: string) => {
    const updated = { ...value, [key]: next };
    if (key === "project_id") {
      delete updated.package_id;
      delete updated.location_id;
    }
    onChange(updated);
  };

  return (
    <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-5">
      <Field label="Project">
        <Select value={value.project_id ?? ""} onChange={(event) => set("project_id", event.target.value)}>
          <Options
            placeholder="All projects"
            items={(projects.data ?? []).map((project) => ({ value: project.id, label: project.project_code }))}
          />
        </Select>
      </Field>
      <Field label="Package">
        <Select
          value={value.package_id ?? ""}
          onChange={(event) => set("package_id", event.target.value)}
          disabled={!value.project_id}
        >
          <Options
            placeholder="All packages"
            items={(packages.data ?? []).map((pkg) => ({ value: pkg.id, label: pkg.package_code }))}
          />
        </Select>
      </Field>
      <Field label="Location">
        <Select
          value={value.location_id ?? ""}
          onChange={(event) => set("location_id", event.target.value)}
          disabled={!value.project_id}
        >
          <Options
            placeholder="All locations"
            items={(locations.data ?? []).map((location) => ({ value: location.location_id, label: location.full_path }))}
          />
        </Select>
      </Field>
      <Field label="Category">
        <Select value={value.category_id ?? ""} onChange={(event) => set("category_id", event.target.value)}>
          <Options
            placeholder="All categories"
            items={(categories.data ?? []).map((category) => ({ value: category.id, label: category.name }))}
          />
        </Select>
      </Field>
      <Field label="Reported by">
        <Select value={value.reported_by ?? ""} onChange={(event) => set("reported_by", event.target.value)}>
          <Options placeholder="Anyone" items={(users.data ?? []).map((user) => ({ value: user.id, label: user.name }))} />
        </Select>
      </Field>
      <Field label="Status">
        <Select value={value.status ?? ""} onChange={(event) => set("status", event.target.value)}>
          <Options placeholder="Any status" items={enumOptions(DB_ISSUE_STATUSES)} />
          <option value="OPEN,IN_PROGRESS,RECTIFIED,VERIFIED">Unresolved (csv)</option>
        </Select>
      </Field>
      <Field label="Severity">
        <Select value={value.severity ?? ""} onChange={(event) => set("severity", event.target.value)}>
          <Options placeholder="Any severity" items={enumOptions(DB_ISSUE_SEVERITIES)} />
          <option value="HIGH,CRITICAL">High + critical (csv)</option>
        </Select>
      </Field>
      <Field label="Observed from">
        <Input type="date" value={value.from ?? ""} onChange={(event) => set("from", event.target.value)} />
      </Field>
      <Field label="Observed to">
        <Input type="date" value={value.to ?? ""} onChange={(event) => set("to", event.target.value)} />
      </Field>
      {search && (
        <Field label="Search">
          <Input value={value.q ?? ""} onChange={(event) => set("q", event.target.value)} placeholder="title, text, location" />
        </Field>
      )}
      <div className="flex items-end">
        <Button type="button" variant="secondary" onClick={() => onChange({})}>
          Clear filters
        </Button>
      </div>
    </div>
  );
}
