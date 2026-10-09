// Mirrors the PostgreSQL enums in src/db/qc_reporting_schema.sql.

export const ROLE_NAMES = [
  "GENERAL_MANAGER",
  "MANAGER",
  "ASSISTANT_MANAGER",
  "ASSISTANT_ENGINEER",
  "INDIVIDUAL_CONSULTANT",
] as const;

export const PROJECT_STATUSES = ["PLANNING", "ACTIVE", "ON_HOLD", "COMPLETED", "CANCELLED", "ARCHIVED"] as const;
export const PACKAGE_STATUSES = PROJECT_STATUSES;

export const LOCATION_TYPES = [
  "SITE",
  "BUILDING",
  "FLOOR",
  "ROOM",
  "ROAD",
  "UTILITY",
  "DRAINAGE",
  "BOUNDARY",
  "LANDSCAPE",
  "EXTERNAL_WORK",
  "ROOFTOP",
  "OTHER",
] as const;

export const DB_ISSUE_STATUSES = ["OPEN", "IN_PROGRESS", "RECTIFIED", "VERIFIED", "CLOSED", "REJECTED"] as const;
export const DB_ISSUE_SEVERITIES = ["LOW", "MEDIUM", "HIGH", "CRITICAL"] as const;

export const DB_REPORT_STATUSES = ["DRAFT", "SUBMITTED", "UNDER_REVIEW", "APPROVED", "REJECTED", "REOPENED"] as const;
export const EDITABLE_REPORT_STATUSES = ["DRAFT", "REJECTED", "REOPENED"] as const;

export const REPORT_SECTION_TYPES = [
  "CRITICAL_OBSERVATIONS",
  "GENERAL_OBSERVATIONS",
  "LOCATION",
  "PROJECT_PROGRESS_SUBMITTAL_STATUS",
  "RISK_ASSESSMENT",
  "RECOMMENDATIONS",
  "OTHER",
] as const;

export const REPORT_WORKFLOW_ACTIONS = ["submit", "review", "approve", "reject", "reopen"] as const;

export type RoleName = (typeof ROLE_NAMES)[number];
export type DbIssueStatus = (typeof DB_ISSUE_STATUSES)[number];
export type DbIssueSeverity = (typeof DB_ISSUE_SEVERITIES)[number];
export type DbReportStatus = (typeof DB_REPORT_STATUSES)[number];
export type ReportSectionType = (typeof REPORT_SECTION_TYPES)[number];
export type ReportWorkflowAction = (typeof REPORT_WORKFLOW_ACTIONS)[number];
