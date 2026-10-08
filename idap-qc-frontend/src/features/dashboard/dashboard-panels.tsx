import {
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  ClipboardList,
  Clock3,
  FileEdit,
  ScanSearch,
  type LucideIcon,
} from "lucide-react";
import Link from "next/link";
import { Card, Skeleton } from "@/components/ui";
import { routes } from "@/constants/routes";
import {
  ISSUE_SEVERITIES,
  ISSUE_SEVERITY_BAR_COLORS,
  ISSUE_SEVERITY_LABELS,
  REPORT_STATUSES,
  REPORT_STATUS_LABELS,
} from "@/constants/statuses";
import type { DashboardMetrics } from "@/types/domain";

export interface DashboardScope {
  projectId: string;
  packageId?: string;
}

const tileLink =
  "rounded-xl transition hover:-translate-y-0.5 hover:shadow-md focus-visible:-translate-y-0.5";

export function MetricGrid({ data, scope }: { data: DashboardMetrics; scope: DashboardScope }) {
  const { projectId, packageId } = scope;
  const metrics: { label: string; hint: string; value: number; href: string; icon: LucideIcon; tone: string }[] = [
    {
      label: "Open issues",
      hint: "View open issues",
      value: data.issues.byStatus.OPEN,
      href: routes.issues(projectId, { package: packageId, status: ["OPEN"] }),
      icon: ClipboardList,
      tone: "text-blue-700 bg-blue-50",
    },
    {
      label: "In progress",
      hint: "View issues being fixed",
      value: data.issues.byStatus.IN_PROGRESS,
      href: routes.issues(projectId, { package: packageId, status: ["IN_PROGRESS"] }),
      icon: Clock3,
      tone: "text-amber-700 bg-amber-50",
    },
    {
      label: "Resolved",
      hint: "View resolved issues",
      value: data.issues.byStatus.RESOLVED,
      href: routes.issues(projectId, { package: packageId, status: ["RESOLVED"] }),
      icon: CheckCircle2,
      tone: "text-emerald-700 bg-emerald-50",
    },
    {
      label: "Unresolved critical",
      hint: "View critical issues still open",
      value: data.issues.unresolvedCritical,
      href: routes.issues(projectId, { package: packageId, severity: ["CRITICAL"], status: ["OPEN", "IN_PROGRESS"] }),
      icon: AlertTriangle,
      tone: "text-red-700 bg-red-50",
    },
    {
      label: "Draft reports",
      hint: "View draft reports",
      value: data.reports.byStatus.DRAFT,
      href: routes.reports(projectId, { package: packageId, status: ["DRAFT"] }),
      icon: FileEdit,
      tone: "text-slate-700 bg-slate-100",
    },
    {
      label: "Awaiting review",
      hint: "View reports waiting for review",
      value: data.reports.byStatus.SUBMITTED + data.reports.byStatus.UNDER_REVIEW,
      href: routes.reports(projectId, { package: packageId, status: ["SUBMITTED", "UNDER_REVIEW"] }),
      icon: ScanSearch,
      tone: "text-violet-700 bg-violet-50",
    },
  ];

  return (
    <section aria-label="Key metrics" className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
      {metrics.map(({ label, hint, value, href, icon: Icon, tone }) => (
        <Link key={label} href={href} className={`group ${tileLink}`}>
          <Card className="flex h-full items-center justify-between group-hover:border-teal-400">
            <div>
              <p className="text-sm text-slate-500">{label}</p>
              <p className="mt-1 text-3xl font-bold text-slate-950">{value}</p>
              <p className="mt-2 flex items-center gap-1 text-xs font-medium text-teal-700 opacity-0 transition group-hover:opacity-100 group-focus-visible:opacity-100">
                {hint}
                <ArrowRight className="size-3" />
              </p>
            </div>
            <span className={`grid size-12 place-items-center rounded-xl ${tone}`}>
              <Icon className="size-6" />
            </span>
          </Card>
        </Link>
      ))}
    </section>
  );
}

export function BreakdownPanels({ data, scope }: { data: DashboardMetrics; scope: DashboardScope }) {
  const { projectId, packageId } = scope;
  const issueTotal = data.issues.total;

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <Card>
        <PanelHeading
          title="Issue severity"
          total={issueTotal}
          noun="issues"
          href={routes.issues(projectId, { package: packageId })}
        />
        {issueTotal === 0 ? (
          <p className="mt-5 rounded-lg bg-slate-50 p-4 text-sm text-slate-500">No issues recorded in this scope yet.</p>
        ) : (
          <div className="mt-4 grid gap-1">
            {ISSUE_SEVERITIES.map((severity) => {
              const count = data.issues.bySeverity[severity];
              return (
                <Link
                  key={severity}
                  href={routes.issues(projectId, { package: packageId, severity: [severity] })}
                  aria-label={`${count} ${ISSUE_SEVERITY_LABELS[severity].toLowerCase()} issues`}
                  className="grid grid-cols-[5rem_1fr_2rem] items-center gap-3 rounded-lg px-2 py-1.5 text-sm hover:bg-slate-50"
                >
                  <span>{ISSUE_SEVERITY_LABELS[severity]}</span>
                  <span className="h-2 overflow-hidden rounded-full bg-slate-100">
                    <span
                      className={`block h-full ${ISSUE_SEVERITY_BAR_COLORS[severity]}`}
                      style={{ width: `${(count / issueTotal) * 100}%` }}
                    />
                  </span>
                  <strong className="text-right">{count}</strong>
                </Link>
              );
            })}
          </div>
        )}
      </Card>
      <Card>
        <PanelHeading
          title="Report workflow"
          total={data.reports.total}
          noun="reports"
          href={routes.reports(projectId, { package: packageId })}
        />
        <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-3">
          {REPORT_STATUSES.map((status) => (
            <Link
              key={status}
              href={routes.reports(projectId, { package: packageId, status: [status] })}
              className="rounded-lg border border-transparent bg-slate-50 p-4 transition hover:border-teal-300 hover:bg-teal-50"
            >
              <p className="text-xs text-slate-500">{REPORT_STATUS_LABELS[status]}</p>
              <p className="mt-1 text-xl font-bold">{data.reports.byStatus[status]}</p>
            </Link>
          ))}
        </div>
      </Card>
    </div>
  );
}

export function DashboardSkeleton() {
  return (
    <div role="status" aria-label="Loading dashboard" className="grid gap-6">
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {Array.from({ length: 6 }, (_, index) => (
          <Card key={index} className="flex items-center justify-between">
            <div className="grid gap-3">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-8 w-12" />
            </div>
            <Skeleton className="size-12 rounded-xl" />
          </Card>
        ))}
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        {Array.from({ length: 2 }, (_, index) => (
          <Card key={index} className="grid gap-4">
            <Skeleton className="h-5 w-32" />
            {Array.from({ length: 4 }, (_, row) => (
              <Skeleton key={row} className="h-3 w-full" />
            ))}
          </Card>
        ))}
      </div>
    </div>
  );
}

function PanelHeading({ title, total, noun, href }: { title: string; total: number; noun: string; href: string }) {
  return (
    <div className="flex items-baseline justify-between">
      <h2 className="font-semibold">{title}</h2>
      <Link href={href} className="text-xs font-semibold text-teal-700 hover:text-teal-900">
        View all {total} {noun}
      </Link>
    </div>
  );
}
