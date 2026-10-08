import type { IssueSeverity, IssueStatus, ReportStatus } from "@/types/domain";

export interface PageDto<T> {
  data: T[];
  page: number;
  page_size: number;
  total: number;
}

export interface ProblemDetailsDto {
  type?: string;
  title: string;
  status: number;
  detail?: string;
  errors?: Record<string, string[]>;
}

export interface IssueDto {
  id: string;
  site_location_id: string;
  generic_issue_id: string | null;
  title: string;
  description: string;
  root_cause: string | null;
  risk_description: string | null;
  severity: IssueSeverity;
  status: IssueStatus;
  observed_at: string;
  updated_at: string;
}

export interface ReportDto {
  id: string;
  project_id: string;
  package_id: string | null;
  document_no: string;
  title: string;
  site_visit_date: string;
  status: ReportStatus;
  report_template_id: string;
  updated_at: string;
}
