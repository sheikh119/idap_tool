"use client";

import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { ClipboardPlus, FilePlus2, FolderPlus, Inbox, RotateCw } from "lucide-react";
import Link from "next/link";
import { EmptyState, ErrorState } from "@/components/feedback";
import { Button, Card, PageHeader, Select, buttonStyles } from "@/components/ui";
import { AddProjectDialog } from "@/features/projects/add-project-dialog";
import { routes } from "@/constants/routes";
import { cn } from "@/lib/cn";
import { dashboardApi, projectApi } from "@/services/api";
import { BreakdownPanels, DashboardSkeleton, MetricGrid } from "./dashboard-panels";
import { useDashboardFilters } from "./use-dashboard-filters";

export function DashboardView() {
  const { requestedProjectId, requestedPackageId, setFilters } = useDashboardFilters();

  const projectsQuery = useQuery({ queryKey: ["projects"], queryFn: projectApi.list });
  const projectList = projectsQuery.data ?? [];
  const projectId = projectList.some((project) => project.id === requestedProjectId)
    ? requestedProjectId
    : projectList[0]?.id;

  const packagesQuery = useQuery({
    queryKey: ["packages", projectId],
    queryFn: () => projectApi.packages(projectId!),
    enabled: Boolean(projectId),
  });
  const packageList = packagesQuery.data ?? [];
  const packageId = packageList.some((pkg) => pkg.id === requestedPackageId) ? requestedPackageId : undefined;
  const selectedPackage = packageList.find((pkg) => pkg.id === packageId);
  const packagesSettled = !requestedPackageId || !packagesQuery.isPending;

  const dashboardQuery = useQuery({
    queryKey: ["dashboard", projectId, packageId ?? "all"],
    queryFn: () => dashboardApi.get({ projectId, packageId }),
    enabled: Boolean(projectId) && packagesSettled,
    placeholderData: keepPreviousData,
    staleTime: 0,
  });
  const { data, isFetching, isPlaceholderData, isError, refetch } = dashboardQuery;

  const onProjectCreated = (project: { id: string }) => setFilters({ projectId: project.id });
  const header = (
    <PageHeader
      title="QC dashboard"
      description="Project quality status and report workflow at a glance."
      actions={
        projectId ? (
          <div className="flex flex-wrap gap-2">
            <Link href={routes.newIssue(projectId)} className={buttonStyles()}>
              <ClipboardPlus className="mr-2 size-4" />
              New issue
            </Link>
            <Link href={routes.newReport(projectId)} className={buttonStyles("secondary")}>
              <FilePlus2 className="mr-2 size-4" />
              New report
            </Link>
            <AddProjectDialog triggerVariant="secondary" onCreated={onProjectCreated} />
          </div>
        ) : undefined
      }
    />
  );

  if (projectsQuery.isError) {
    return (
      <div className="grid gap-6">
        {header}
        <ErrorState
          title="Projects could not be loaded"
          description="Check your connection and try again. If the problem continues, contact your administrator."
          onRetry={() => projectsQuery.refetch()}
          retrying={projectsQuery.isFetching}
        />
      </div>
    );
  }

  if (projectsQuery.isSuccess && projectList.length === 0) {
    return (
      <div className="grid gap-6">
        {header}
        <EmptyState
          icon={FolderPlus}
          title="No projects yet"
          description="Create your first project to start recording site issues and building inspection reports. If you expected to see projects here, ask an administrator to assign you."
          actions={<AddProjectDialog onCreated={onProjectCreated} />}
        />
      </div>
    );
  }

  const isEmpty = data !== undefined && data.issues.total === 0 && data.reports.total === 0;

  return (
    <div className="grid gap-6">
      {header}

      <Card className="grid gap-4 sm:grid-cols-2">
        <label className="grid gap-1 text-sm font-medium text-slate-700">
          Project
          <Select
            value={projectId ?? ""}
            onChange={(event) => setFilters({ projectId: event.target.value })}
            disabled={projectsQuery.isPending}
          >
            {projectsQuery.isPending && <option value="">Loading projects…</option>}
            {projectList.map((project) => (
              <option key={project.id} value={project.id}>
                {project.code} — {project.name}
              </option>
            ))}
          </Select>
        </label>
        <div className="grid gap-1">
          <label className="grid gap-1 text-sm font-medium text-slate-700">
            Package
            <Select
              value={packageId ?? ""}
              onChange={(event) => setFilters({ projectId, packageId: event.target.value || undefined })}
              disabled={!projectId || packagesQuery.isPending || packageList.length === 0}
            >
              <option value="">
                {packagesQuery.isPending
                  ? "Loading packages…"
                  : packagesQuery.isError
                    ? "Packages unavailable"
                    : packageList.length === 0
                      ? "No packages in this project"
                      : "All packages"}
              </option>
              {packageList.map((pkg) => (
                <option key={pkg.id} value={pkg.id}>
                  {pkg.code} — {pkg.name}
                </option>
              ))}
            </Select>
          </label>
          {packagesQuery.isError && (
            <p className="text-xs text-red-700">
              Packages could not be loaded.{" "}
              <button type="button" className="font-semibold underline" onClick={() => packagesQuery.refetch()}>
                Retry
              </button>
            </p>
          )}
        </div>
      </Card>

      {data && (
        <div className="-mt-3 flex items-center justify-between gap-3 text-xs text-slate-500">
          <span aria-live="polite">
            {isFetching ? "Updating…" : `Updated ${formatTime(data.generatedAt)}`}
          </span>
          <button
            type="button"
            className="inline-flex items-center gap-1 font-semibold text-teal-700 hover:text-teal-900 disabled:opacity-50"
            onClick={() => refetch()}
            disabled={isFetching}
          >
            <RotateCw className={cn("size-3", isFetching && "animate-spin")} />
            Refresh
          </button>
        </div>
      )}

      {isError && data && (
        <p role="alert" className="rounded-lg bg-amber-50 p-3 text-sm text-amber-900">
          The dashboard could not be refreshed. You are seeing the last loaded numbers.{" "}
          <button type="button" className="font-semibold underline" onClick={() => refetch()}>
            Try again
          </button>
        </p>
      )}

      {isError && !data ? (
        <ErrorState
          title="Dashboard could not be loaded"
          description="The QC metrics for this project are unavailable right now."
          onRetry={() => refetch()}
          retrying={isFetching}
        />
      ) : !data ? (
        <DashboardSkeleton />
      ) : isEmpty && !isPlaceholderData ? (
        selectedPackage ? (
          <EmptyState
            icon={Inbox}
            title={`Nothing recorded for ${selectedPackage.name} yet`}
            description="No issues or reports belong to this package. Issues are counted by the package of their site location."
            actions={
              <Button variant="secondary" onClick={() => setFilters({ projectId })}>
                Show all packages
              </Button>
            }
          />
        ) : (
          <EmptyState
            icon={Inbox}
            title="No QC activity in this project yet"
            description="Record the first site issue, or create an inspection report to start tracking quality here."
            actions={
              <>
                <Link href={routes.newIssue(projectId!)} className={buttonStyles()}>
                  <ClipboardPlus className="mr-2 size-4" />
                  Record first issue
                </Link>
                <Link href={routes.newReport(projectId!)} className={buttonStyles("secondary")}>
                  <FilePlus2 className="mr-2 size-4" />
                  Create report
                </Link>
              </>
            }
          />
        )
      ) : (
        <div className={cn("grid gap-6 transition-opacity", isPlaceholderData && "opacity-60")}>
          <MetricGrid data={data} scope={{ projectId: projectId!, packageId }} />
          <BreakdownPanels data={data} scope={{ projectId: projectId!, packageId }} />
        </div>
      )}
    </div>
  );
}

function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}
