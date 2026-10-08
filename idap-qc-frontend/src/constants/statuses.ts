import type { IssueSeverity, IssueStatus, ReportStatus } from "@/types/domain";

export const ISSUE_STATUSES: readonly IssueStatus[] = ["OPEN", "IN_PROGRESS", "RESOLVED", "REJECTED"];
export const ISSUE_SEVERITIES: readonly IssueSeverity[] = ["CRITICAL", "HIGH", "MEDIUM", "LOW"];
export const REPORT_STATUSES: readonly ReportStatus[] = ["DRAFT", "SUBMITTED", "UNDER_REVIEW", "APPROVED", "REJECTED"];

export const ISSUE_STATUS_LABELS: Record<IssueStatus, string> = {
  OPEN: "Open",
  IN_PROGRESS: "In progress",
  RESOLVED: "Resolved",
  REJECTED: "Rejected",
};

export const ISSUE_SEVERITY_LABELS: Record<IssueSeverity, string> = {
  CRITICAL: "Critical",
  HIGH: "High",
  MEDIUM: "Medium",
  LOW: "Low",
};

export const ISSUE_SEVERITY_BAR_COLORS: Record<IssueSeverity, string> = {
  CRITICAL: "bg-red-600",
  HIGH: "bg-orange-500",
  MEDIUM: "bg-amber-400",
  LOW: "bg-blue-500",
};

export const REPORT_STATUS_LABELS: Record<ReportStatus, string> = {
  DRAFT: "Draft",
  SUBMITTED: "Submitted",
  UNDER_REVIEW: "Under review",
  APPROVED: "Approved",
  REJECTED: "Rejected",
};
