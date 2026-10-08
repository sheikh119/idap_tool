"use client";

import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { FilePlus2, FileText, Filter, Plus } from "lucide-react";
import Link from "next/link";
import { EmptyState, ErrorState } from "@/components/feedback";
import { Badge, Button, Card, PageHeader, Select, Skeleton, buttonStyles } from "@/components/ui";
import { parseList, routes } from "@/constants/routes";
import { REPORT_STATUSES, REPORT_STATUS_LABELS } from "@/constants/statuses";
import { useSearchParamState } from "@/hooks/use-search-param-state";
import { cn } from "@/lib/cn";
import { projectApi, reportApi } from "@/services/api";

const tones = { DRAFT: "slate", SUBMITTED: "blue", UNDER_REVIEW: "amber", APPROVED: "green", REJECTED: "red" } as const;
const AWAITING_REVIEW = "SUBMITTED,UNDER_REVIEW";

export function ReportsView({ projectId }: { projectId: string }) {
  const { searchParams, setParams } = useSearchParamState();
  const statuses = parseList(searchParams.get("status"), REPORT_STATUSES);
  const requestedPackageId = searchParams.get("package") ?? undefined;

  const packagesQuery = useQuery({
    queryKey: ["packages", projectId],
    queryFn: () => projectApi.packages(projectId),
  });
  const packageList = packagesQuery.data ?? [];
  const packageId = packageList.some((pkg) => pkg.id === requestedPackageId) ? requestedPackageId : undefined;

  const filters = { projectId, packageId, statuses };
  const { data, isError, isFetching, isPlaceholderData, refetch } = useQuery({
    queryKey: ["reports", filters],
    queryFn: () => reportApi.list(filters),
    enabled: !requestedPackageId || !packagesQuery.isPending,
    placeholderData: keepPreviousData,
    staleTime: 0,
  });

  const statusValue = statuses.join(",");
  const hasFilters = Boolean(packageId || statuses.length);
  const clearFilters = () => setParams({ package: undefined, status: undefined });

  return (
    <div className="grid gap-6">
      <PageHeader
        title="Inspection reports"
        description="Build, submit, review, and generate standardized QC reports."
        actions={
          <Link href={routes.newReport(projectId)} className={buttonStyles()}>
            <Plus className="mr-2 size-4" />
            New report
          </Link>
        }
      />

      <Card className="grid gap-3 sm:grid-cols-2">
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
          aria-label="Status filter"
          value={statusValue}
          onChange={(event) => setParams({ status: event.target.value || undefined })}
        >
          <option value="">All statuses</option>
          <option value={AWAITING_REVIEW}>Awaiting review (submitted + under review)</option>
          {statuses.length > 1 && statusValue !== AWAITING_REVIEW && (
            <option value={statusValue}>{statuses.map((item) => REPORT_STATUS_LABELS[item]).join(" + ")}</option>
          )}
          {REPORT_STATUSES.map((status) => (
            <option key={status} value={status}>
              {REPORT_STATUS_LABELS[status]}
            </option>
          ))}
        </Select>
      </Card>

      {data && (
        <div className="-mt-3 flex items-center justify-between text-sm text-slate-500">
          <span aria-live="polite">
            {isFetching && isPlaceholderData ? "Updating…" : `${data.length} report${data.length === 1 ? "" : "s"}`}
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
          title="Reports could not be loaded"
          description="Check your connection and try again."
          onRetry={() => refetch()}
          retrying={isFetching}
        />
      ) : !data ? (
        <div role="status" aria-label="Loading reports" className="grid gap-4">
          {Array.from({ length: 3 }, (_, index) => (
            <Card key={index} className="grid gap-2">
              <Skeleton className="h-4 w-1/3" />
              <Skeleton className="h-3 w-1/2" />
            </Card>
          ))}
        </div>
      ) : data.length === 0 ? (
        hasFilters ? (
          <EmptyState
            icon={Filter}
            title="No reports match these filters"
            description="Try a different package or status, or clear the filters to see every report in this project."
            actions={<Button variant="secondary" onClick={clearFilters}>Clear filters</Button>}
          />
        ) : (
          <EmptyState
            icon={FilePlus2}
            title="No reports yet"
            description="Create an inspection report to group this project's issues for review."
            actions={
              <Link href={routes.newReport(projectId)} className={buttonStyles()}>
                Create first report
              </Link>
            }
          />
        )
      ) : (
        <div className={cn("grid gap-4 transition-opacity", isPlaceholderData && "opacity-60")}>
          {data.map((report) => (
            <Link
              key={report.id}
              href={routes.report(projectId, report.id)}
              className="grid gap-3 rounded-xl border border-slate-200 bg-white p-5 shadow-sm transition hover:border-teal-400 md:grid-cols-[1fr_11rem_10rem] md:items-center"
            >
              <div className="flex gap-3">
                <span className="grid size-10 shrink-0 place-items-center rounded-lg bg-teal-50 text-teal-700">
                  <FileText />
                </span>
                <span>
                  <strong className="block text-slate-950">{report.title}</strong>
                  <span className="mt-1 block text-sm text-slate-500">
                    {report.documentNo} · {report.templateName}
                  </span>
                </span>
              </div>
              <span className="text-sm text-slate-600">Visit: {report.siteVisitDate}</span>
              <span>
                <Badge tone={tones[report.status]}>{REPORT_STATUS_LABELS[report.status]}</Badge>
              </span>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
