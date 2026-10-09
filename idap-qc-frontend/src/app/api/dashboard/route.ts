import { db, listParam, param, route, unwrap } from "@/lib/api/server";
import { DB_ISSUE_SEVERITIES, DB_ISSUE_STATUSES, DB_REPORT_STATUSES } from "@/lib/db/enums";

type IssueRow = {
  status: string;
  severity: string;
  category_name: string | null;
  location_path: string | null;
  project_code: string;
  package_code: string | null;
  reporter_name: string;
};

type ReportRow = { status: string };

const UNRESOLVED = ["OPEN", "IN_PROGRESS", "RECTIFIED", "VERIFIED"];

function countBy<T>(rows: T[], pick: (row: T) => string | null, keys: readonly string[] = []) {
  const counts: Record<string, number> = Object.fromEntries(keys.map((key) => [key, 0]));
  for (const row of rows) {
    const key = pick(row) ?? "Unassigned";
    counts[key] = (counts[key] ?? 0) + 1;
  }
  return counts;
}

/**
 * Filters: project_id, package_id, location_id, category_id, reported_by,
 * status (csv), severity (csv), from / to (dates).
 */
export const GET = route(async (request) => {
  let issues = db()
    .from("v_issue_details")
    .select("status, severity, category_name, location_path, project_code, package_code, reporter_name");
  let reports = db().from("v_report_summary").select("status");

  for (const [name, column] of [
    ["project_id", "project_id"],
    ["package_id", "package_id"],
    ["location_id", "site_location_id"],
    ["category_id", "category_id"],
    ["reported_by", "reported_by"],
  ] as const) {
    const value = param(request, name);
    if (value) issues = issues.eq(column, value);
  }
  for (const name of ["project_id", "package_id"] as const) {
    const value = param(request, name);
    if (value) reports = reports.eq(name, value);
  }

  const statuses = listParam(request, "status");
  const severities = listParam(request, "severity");
  const from = param(request, "from");
  const to = param(request, "to");
  if (statuses) issues = issues.in("status", statuses);
  if (severities) issues = issues.in("severity", severities);
  if (from) {
    issues = issues.gte("observed_at", from);
    reports = reports.gte("site_visit_date", from);
  }
  if (to) {
    issues = issues.lte("observed_at", `${to}T23:59:59.999Z`);
    reports = reports.lte("site_visit_date", to);
  }

  const [issueRows, reportRows] = await Promise.all([issues, reports]).then(([i, r]) => [
    unwrap<IssueRow[]>(i),
    unwrap<ReportRow[]>(r),
  ] as const);

  const byReportStatus = countBy(reportRows, (row) => row.status, DB_REPORT_STATUSES);

  return {
    issues: {
      total: issueRows.length,
      unresolved: issueRows.filter((row) => UNRESOLVED.includes(row.status)).length,
      unresolvedCritical: issueRows.filter((row) => row.severity === "CRITICAL" && UNRESOLVED.includes(row.status)).length,
      byStatus: countBy(issueRows, (row) => row.status, DB_ISSUE_STATUSES),
      bySeverity: countBy(issueRows, (row) => row.severity, DB_ISSUE_SEVERITIES),
      byCategory: countBy(issueRows, (row) => row.category_name),
      byLocation: countBy(issueRows, (row) => row.location_path),
      byProject: countBy(issueRows, (row) => row.project_code),
      byPackage: countBy(issueRows, (row) => row.package_code),
      byReporter: countBy(issueRows, (row) => row.reporter_name),
    },
    reports: {
      total: reportRows.length,
      awaitingReview: (byReportStatus.SUBMITTED ?? 0) + (byReportStatus.UNDER_REVIEW ?? 0),
      byStatus: byReportStatus,
    },
    generatedAt: new Date().toISOString(),
  };
});
