"use client";

import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { ClipboardPlus, Filter, Plus, Search } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { EmptyState, ErrorState } from "@/components/feedback";
import { Badge, Button, Card, Input, PageHeader, Select, Skeleton, buttonStyles } from "@/components/ui";
import { parseList, routes } from "@/constants/routes";
import {
  ISSUE_SEVERITIES,
  ISSUE_SEVERITY_LABELS,
  ISSUE_STATUSES,
  ISSUE_STATUS_LABELS,
} from "@/constants/statuses";
import { useDebouncedValue } from "@/hooks/use-debounced-value";
import { useSearchParamState } from "@/hooks/use-search-param-state";
import { cn } from "@/lib/cn";
import { issueApi, projectApi } from "@/services/api";

const severityTone = { LOW: "blue", MEDIUM: "amber", HIGH: "amber", CRITICAL: "red" } as const;
const statusTone = { OPEN: "blue", IN_PROGRESS: "amber", RESOLVED: "green", REJECTED: "red" } as const;
const UNRESOLVED = "OPEN,IN_PROGRESS";

export function IssuesView({ projectId }: { projectId: string }) {
  const { searchParams, setParams } = useSearchParamState();
  const statuses = parseList(searchParams.get("status"), ISSUE_STATUSES);
  const severities = parseList(searchParams.get("severity"), ISSUE_SEVERITIES);
  const requestedPackageId = searchParams.get("package") ?? undefined;

  const [searchText, setSearchText] = useState("");
  const search = useDebouncedValue(searchText.trim());

  const packagesQuery = useQuery({
    queryKey: ["packages", projectId],
    queryFn: () => projectApi.packages(projectId),
  });
  const packageList = packagesQuery.data ?? [];
  const packageId = packageList.some((pkg) => pkg.id === requestedPackageId) ? requestedPackageId : undefined;

  const filters = { projectId, packageId, statuses, severities, search };
  const issuesQuery = useQuery({
    queryKey: ["issues", filters],
    queryFn: () => issueApi.list(filters),
    enabled: !requestedPackageId || !packagesQuery.isPending,
    placeholderData: keepPreviousData,
    staleTime: 0,
  });
  const { data, isError, isFetching, isPlaceholderData, refetch } = issuesQuery;

  const statusValue = statuses.join(",");
  const hasFilters = Boolean(packageId || statuses.length || severities.length || search);

  function clearFilters() {
    setSearchText("");
    setParams({ package: undefined, status: undefined, severity: undefined });
  }

  return (
    <div className="grid gap-6">
      <PageHeader
        title="Issues"
        description="Capture, filter, and track site quality observations."
        actions={
          <Link href={routes.newIssue(projectId)} className={buttonStyles()}>
            <Plus className="mr-2 size-4" />
            New issue
          </Link>
        }
      />

      <Card className="grid gap-3 md:grid-cols-2 xl:grid-cols-[1fr_repeat(3,12rem)]">
        <label className="relative md:col-span-2 xl:col-span-1">
          <span className="sr-only">Search issues</span>
          <Search className="absolute left-3 top-3.5 size-4 text-slate-400" />
          <Input
            className="pl-9"
            placeholder="Search title, description, location…"
            value={searchText}
            onChange={(event) => setSearchText(event.target.value)}
          />
        </label>
        <Select
          aria-label="Package filter"
          value={packageId ?? ""}
          onChange={(event) => setParams({ package: event.target.value || undefined })}
          disabled={packagesQuery.isPending || packageList.length === 0}
        >
          <option value="">{packageList.length === 0 && !packagesQuery.isPending ? "No packages" : "All packages"}</option>
          {packageList.map((pkg) => (
            <option key={pkg.id} value={pkg.id}>
              {pkg.code} — {pkg.name}
            </option>
          ))}
        </Select>
        <Select
          aria-label="Severity filter"
          value={severities.join(",")}
          onChange={(event) => setParams({ severity: event.target.value || undefined })}
        >
          <option value="">All severities</option>
          {severities.length > 1 && <option value={severities.join(",")}>{severities.map((item) => ISSUE_SEVERITY_LABELS[item]).join(" + ")}</option>}
          {ISSUE_SEVERITIES.map((severity) => (
            <option key={severity} value={severity}>
              {ISSUE_SEVERITY_LABELS[severity]}
            </option>
          ))}
        </Select>
        <Select
          aria-label="Status filter"
          value={statusValue}
          onChange={(event) => setParams({ status: event.target.value || undefined })}
        >
          <option value="">All statuses</option>
          <option value={UNRESOLVED}>Unresolved (open + in progress)</option>
          {statuses.length > 1 && statusValue !== UNRESOLVED && (
            <option value={statusValue}>{statuses.map((item) => ISSUE_STATUS_LABELS[item]).join(" + ")}</option>
          )}
          {ISSUE_STATUSES.map((status) => (
            <option key={status} value={status}>
              {ISSUE_STATUS_LABELS[status]}
            </option>
          ))}
        </Select>
      </Card>

      {data && (
        <div className="-mt-3 flex items-center justify-between text-sm text-slate-500">
          <span aria-live="polite">
            {isFetching && isPlaceholderData ? "Updating…" : `${data.length} issue${data.length === 1 ? "" : "s"}`}
          </span>
          {hasFilters && (
            <button type="button" className="font-semibold text-teal-700 hover:text-teal-900" onClick={clearFilters}>
              Clear filters
            </button>
          )}
        </div>
      )}

      {isError && !data ? (
        <ErrorState
          title="Issues could not be loaded"
          description="Check your connection and try again."
          onRetry={() => refetch()}
          retrying={isFetching}
        />
      ) : !data ? (
        <Card role="status" aria-label="Loading issues" className="grid gap-4">
          {Array.from({ length: 4 }, (_, index) => (
            <div key={index} className="grid gap-2">
              <Skeleton className="h-4 w-1/3" />
              <Skeleton className="h-3 w-2/3" />
            </div>
          ))}
        </Card>
      ) : data.length === 0 ? (
        hasFilters ? (
          <EmptyState
            icon={Filter}
            title="No issues match these filters"
            description="Try a different package, severity, or status, or clear the filters to see every issue in this project."
            actions={<Button variant="secondary" onClick={clearFilters}>Clear filters</Button>}
          />
        ) : (
          <EmptyState
            icon={ClipboardPlus}
            title="No issues recorded yet"
            description="Record the first site observation for this project."
            actions={
              <Link href={routes.newIssue(projectId)} className={buttonStyles()}>
                Record first issue
              </Link>
            }
          />
        )
      ) : (
        <div
          className={cn(
            "overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm transition-opacity",
            isPlaceholderData && "opacity-60",
          )}
        >
          <div className="hidden grid-cols-[1fr_11rem_8rem_9rem] gap-4 border-b bg-slate-50 px-5 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500 md:grid">
            <span>Observation</span>
            <span>Location</span>
            <span>Severity</span>
            <span>Status</span>
          </div>
          {data.map((issue) => (
            <Link
              key={issue.id}
              href={routes.issue(projectId, issue.id)}
              className="grid gap-3 border-b border-slate-100 p-5 last:border-0 hover:bg-slate-50 md:grid-cols-[1fr_11rem_8rem_9rem] md:items-center"
            >
              <span>
                <span className="block font-semibold text-slate-950">{issue.title}</span>
                <span className="mt-1 block text-sm text-slate-500">{issue.description}</span>
              </span>
              <span className="text-sm text-slate-600">{issue.locationName}</span>
              <span>
                <Badge tone={severityTone[issue.severity]}>{ISSUE_SEVERITY_LABELS[issue.severity]}</Badge>
              </span>
              <span>
                <Badge tone={statusTone[issue.status]}>{ISSUE_STATUS_LABELS[issue.status]}</Badge>
              </span>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
