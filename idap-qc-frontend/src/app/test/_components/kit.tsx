"use client";

import type { ReactNode } from "react";
import { Badge, Card } from "@/components/ui";
import { cn } from "@/lib/cn";
import { TestApiError } from "../_lib/client";
import type { Row } from "../_lib/queries";

export function Panel({
  title,
  description,
  actions,
  children,
  className,
}: {
  title: string;
  description?: ReactNode;
  actions?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <Card className={cn("grid gap-4", className)}>
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <h2 className="font-semibold text-slate-900">{title}</h2>
          {description && <p className="mt-0.5 text-xs text-slate-500">{description}</p>}
        </div>
        {actions}
      </div>
      {children}
    </Card>
  );
}

export function ErrorNote({ error }: { error: unknown }) {
  if (!error) return null;
  const apiError = error instanceof TestApiError ? error : undefined;
  const message = error instanceof Error ? error.message : String(error);
  return (
    <div role="alert" className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800">
      <p className="font-semibold">
        {apiError && <span className="mr-2 font-mono">{apiError.status}</span>}
        {message}
        {apiError?.code && <span className="ml-2 font-mono text-xs text-red-600">[{apiError.code}]</span>}
      </p>
      {apiError?.details !== undefined && (
        <pre className="mt-2 overflow-x-auto whitespace-pre-wrap text-xs">{JSON.stringify(apiError.details, null, 2)}</pre>
      )}
    </div>
  );
}

export function SuccessNote({ children }: { children: ReactNode }) {
  return <p className="rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800">{children}</p>;
}

export function JsonView({ value, label = "Raw JSON", open = false }: { value: unknown; label?: string; open?: boolean }) {
  return (
    <details open={open} className="rounded-lg border border-slate-200 bg-slate-50 text-xs">
      <summary className="cursor-pointer px-3 py-2 font-medium text-slate-600">{label}</summary>
      <pre className="max-h-[32rem] overflow-auto px-3 pb-3 whitespace-pre-wrap">{JSON.stringify(value, null, 2)}</pre>
    </details>
  );
}

const TONES: Record<string, "slate" | "green" | "amber" | "red" | "blue"> = {
  ACTIVE: "green",
  APPROVED: "green",
  CLOSED: "green",
  VERIFIED: "green",
  RECTIFIED: "blue",
  SUBMITTED: "blue",
  UNDER_REVIEW: "amber",
  IN_PROGRESS: "amber",
  REOPENED: "amber",
  ON_HOLD: "amber",
  HIGH: "amber",
  OPEN: "red",
  REJECTED: "red",
  CRITICAL: "red",
  CANCELLED: "red",
};

export function Pill({ value }: { value?: string | boolean | null }) {
  if (value === null || value === undefined) return <span className="text-slate-400">—</span>;
  if (typeof value === "boolean") return <Badge tone={value ? "green" : "slate"}>{value ? "active" : "inactive"}</Badge>;
  return <Badge tone={TONES[value] ?? "slate"}>{value.replaceAll("_", " ")}</Badge>;
}

export type Column = { key: string; label: string; render?: (row: Row) => ReactNode; className?: string };

export function DataTable({
  columns,
  rows,
  rowKey,
  empty = "No rows",
  selectedKey,
  onSelect,
}: {
  columns: Column[];
  rows: Row[] | undefined;
  rowKey: (row: Row) => string;
  empty?: string;
  selectedKey?: string;
  onSelect?: (row: Row) => void;
}) {
  if (!rows) return <p className="text-sm text-slate-500">Loading…</p>;
  if (!rows.length) return <p className="text-sm text-slate-500">{empty}</p>;
  return (
    <div className="overflow-x-auto rounded-lg border border-slate-200">
      <table className="w-full text-left text-sm">
        <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
          <tr>
            {columns.map((column) => (
              <th key={column.key} className={cn("px-3 py-2 font-semibold", column.className)}>
                {column.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => {
            const key = rowKey(row);
            return (
              <tr
                key={key}
                onClick={onSelect ? () => onSelect(row) : undefined}
                className={cn(
                  "border-t border-slate-100 align-top",
                  onSelect && "cursor-pointer hover:bg-teal-50/60",
                  selectedKey === key && "bg-teal-50",
                )}
              >
                {columns.map((column) => (
                  <td key={column.key} className={cn("px-3 py-2", column.className)}>
                    {column.render ? column.render(row) : formatCell(row[column.key])}
                  </td>
                ))}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function formatCell(value: unknown): ReactNode {
  if (value === null || value === undefined || value === "") return <span className="text-slate-400">—</span>;
  if (typeof value === "boolean") return value ? "yes" : "no";
  if (typeof value === "object") return <code className="text-xs">{JSON.stringify(value)}</code>;
  return String(value);
}

export function formatDate(value?: string | null) {
  if (!value) return "—";
  return new Date(value).toLocaleString();
}

export function Counts({ title, counts }: { title: string; counts: Record<string, number> }) {
  const entries = Object.entries(counts).sort((a, b) => b[1] - a[1]);
  return (
    <div className="rounded-lg border border-slate-200 p-3">
      <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">{title}</h3>
      {entries.length ? (
        <ul className="grid gap-1 text-sm">
          {entries.map(([key, count]) => (
            <li key={key} className="flex justify-between gap-3">
              <span className="truncate">{key}</span>
              <span className="font-mono font-semibold">{count}</span>
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-sm text-slate-400">None</p>
      )}
    </div>
  );
}

export function Options({ items, placeholder }: { items: { value: string; label: string }[]; placeholder?: string }) {
  return (
    <>
      {placeholder !== undefined && <option value="">{placeholder}</option>}
      {items.map((item) => (
        <option key={item.value} value={item.value}>
          {item.label}
        </option>
      ))}
    </>
  );
}

export function enumOptions(values: readonly string[]) {
  return values.map((value) => ({ value, label: value.replaceAll("_", " ") }));
}
