import {
  buildDashboardMetrics,
  filterIssues,
  filterReports,
  genericIssues,
  issues,
  locations,
  packages,
  projects,
  reports,
} from "@/mocks/fixtures";
import type {
  CreateProjectInput,
  DashboardFilters,
  DashboardMetrics,
  Issue,
  IssueFilters,
  Project,
  Report,
  ReportFilters,
  ReportStatus,
} from "@/types/domain";
import { apiRequest } from "./http-client";

const useMocks = process.env.NEXT_PUBLIC_USE_MOCKS !== "false";
const pause = () => new Promise((resolve) => setTimeout(resolve, 120));

async function source<T>(path: string, mock: T): Promise<T> {
  if (!useMocks) return apiRequest<T>(path);
  await pause();
  return structuredClone(mock);
}

export const projectApi = {
  list: () => source("/projects", projects),
  create: async (input: CreateProjectInput) => {
    if (!useMocks) {
      return apiRequest<Project>("/projects", {
        method: "POST",
        body: JSON.stringify(input),
      });
    }
    await pause();
    const project: Project = {
      ...input,
      id: crypto.randomUUID(),
      openIssues: 0,
    };
    projects.push(project);
    return structuredClone(project);
  },
  packages: (projectId: string) =>
    source(
      `/projects/${encodeURIComponent(projectId)}/packages`,
      packages.filter((item) => item.projectId === projectId),
    ),
  locations: (projectId: string) =>
    source(`/projects/${projectId}/locations`, locations.filter((item) => item.projectId === projectId)),
};

export const catalogueApi = {
  list: () => source("/generic-issues", genericIssues),
};

export const dashboardApi = {
  get: async (filters: DashboardFilters = {}) => {
    const params = new URLSearchParams();
    if (filters.projectId) params.set("project_id", filters.projectId);
    if (filters.packageId) params.set("package_id", filters.packageId);
    const query = params.toString();
    if (!useMocks) return apiRequest<DashboardMetrics>(`/dashboard${query ? `?${query}` : ""}`);
    await pause();
    return buildDashboardMetrics(filters);
  },
};

function listQuery(filters: { projectId?: string; packageId?: string; statuses?: string[]; severities?: string[]; search?: string }) {
  const params = new URLSearchParams();
  if (filters.projectId) params.set("project_id", filters.projectId);
  if (filters.packageId) params.set("package_id", filters.packageId);
  if (filters.statuses?.length) params.set("status", filters.statuses.join(","));
  if (filters.severities?.length) params.set("severity", filters.severities.join(","));
  if (filters.search?.trim()) params.set("q", filters.search.trim());
  const query = params.toString();
  return query ? `?${query}` : "";
}

export const issueApi = {
  list: (filters: IssueFilters = {}) => source(`/issues${listQuery(filters)}`, filterIssues(filters)),
  get: (id: string) => source(`/issues/${id}`, issues.find((item) => item.id === id)),
  create: async (input: Omit<Issue, "id" | "reporter" | "images">) => {
    if (!useMocks) return apiRequest<Issue>("/issues", { method: "POST", body: JSON.stringify(input) });
    await pause();
    const issue: Issue = { ...input, id: crypto.randomUUID(), reporter: "Current User", images: [] };
    issues.push(issue);
    return structuredClone(issue);
  },
  update: async (id: string, input: Partial<Issue>) => {
    if (!useMocks) return apiRequest<Issue>(`/issues/${id}`, { method: "PATCH", body: JSON.stringify(input) });
    await pause();
    const current = issues.find((item) => item.id === id);
    if (!current) throw new Error("Issue not found");
    Object.assign(current, input);
    return structuredClone(current);
  },
};

export const reportApi = {
  list: (filters: ReportFilters = {}) => source(`/reports${listQuery(filters)}`, filterReports(filters)),
  get: (id: string) => source(`/reports/${id}`, reports.find((item) => item.id === id)),
  create: async (input: Omit<Report, "id" | "status" | "sections" | "createdBy">) => {
    if (!useMocks) return apiRequest<Report>("/reports", { method: "POST", body: JSON.stringify(input) });
    await pause();
    const report: Report = { ...input, id: crypto.randomUUID(), status: "DRAFT", sections: [], createdBy: "Current User" };
    reports.push(report);
    return structuredClone(report);
  },
  transition: async (id: string, action: ReportAction, comment?: string) => {
    if (!useMocks) {
      return apiRequest(`/reports/${id}/${action}`, { method: "POST", body: JSON.stringify({ comment }) });
    }
    await pause();
    const report = reports.find((item) => item.id === id);
    if (report) report.status = transitionTargets[action];
    return { ok: true, comment };
  },
};

type ReportAction = "submit" | "review" | "approve" | "reject";

const transitionTargets: Record<ReportAction, ReportStatus> = {
  submit: "SUBMITTED",
  review: "UNDER_REVIEW",
  approve: "APPROVED",
  reject: "REJECTED",
};
