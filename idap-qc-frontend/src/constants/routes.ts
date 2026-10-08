import type { IssueSeverity, IssueStatus, ReportStatus } from "@/types/domain";

export interface IssueListQuery {
  package?: string;
  status?: IssueStatus[];
  severity?: IssueSeverity[];
}

export interface ReportListQuery {
  package?: string;
  status?: ReportStatus[];
}

export function withQuery(path: string, query: Record<string, string | readonly string[] | undefined>) {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(query)) {
    const text = typeof value === "string" ? value : value?.join(",");
    if (text) params.set(key, text);
  }
  const search = params.toString().replaceAll("%2C", ",");
  return search ? `${path}?${search}` : path;
}

export const routes = {
  dashboard: "/dashboard",
  issues: (projectId: string, query: IssueListQuery = {}) =>
    withQuery(`/projects/${projectId}/issues`, { ...query }),
  issue: (projectId: string, issueId: string) => `/projects/${projectId}/issues/${issueId}`,
  newIssue: (projectId: string) => `/projects/${projectId}/issues/new`,
  reports: (projectId: string, query: ReportListQuery = {}) =>
    withQuery(`/projects/${projectId}/reports`, { ...query }),
  report: (projectId: string, reportId: string) => `/projects/${projectId}/reports/${reportId}`,
  newReport: (projectId: string) => `/projects/${projectId}/reports/new`,
  buildReport: (projectId: string, reportId: string) => `/projects/${projectId}/reports/${reportId}/build`,
};

export function parseList<T extends string>(value: string | null | undefined, allowed: readonly T[]): T[] {
  if (!value) return [];
  return value
    .split(",")
    .map((item) => item.trim())
    .filter((item): item is T => (allowed as readonly string[]).includes(item));
}
