export type ProjectStatus = "PLANNING" | "ACTIVE" | "COMPLETED" | "ON_HOLD" | "ARCHIVED";
export type IssueSeverity = "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
export type IssueStatus = "OPEN" | "IN_PROGRESS" | "RESOLVED" | "REJECTED";
export type ReportStatus =
  | "DRAFT"
  | "SUBMITTED"
  | "UNDER_REVIEW"
  | "APPROVED"
  | "REJECTED";
export type SectionType = "CRITICAL" | "GENERAL";

export interface Project {
  id: string;
  code: string;
  name: string;
  description?: string;
  status: ProjectStatus;
  startDate?: string;
  endDate?: string;
  openIssues: number;
}

export type CreateProjectInput = Omit<Project, "id" | "openIssues">;

export interface ProjectPackage {
  id: string;
  projectId: string;
  code: string;
  name: string;
  status: ProjectStatus;
}

export interface SiteLocation {
  id: string;
  projectId: string;
  packageId?: string;
  parentId?: string;
  name: string;
  code: string;
  type: "SITE" | "BUILDING" | "FLOOR" | "ROOM" | "ROAD" | "UTILITY" | "OTHER";
}

export interface GenericIssue {
  id: string;
  code: string;
  category: string;
  title: string;
  defaultDescription: string;
  defaultRootCause?: string;
  defaultRisk?: string;
  defaultSeverity?: IssueSeverity;
}

export interface IssueImage {
  id: string;
  url: string;
  caption?: string;
  displayOrder: number;
  annotatedUrl?: string;
}

export interface Issue {
  id: string;
  projectId: string;
  locationId: string;
  locationName: string;
  title: string;
  description: string;
  rootCause?: string;
  riskDescription?: string;
  severity: IssueSeverity;
  status: IssueStatus;
  reporter: string;
  observedAt: string;
  images: IssueImage[];
}

export interface ReportSection {
  id: string;
  type: SectionType;
  heading: string;
  issueIds: string[];
}

export interface Report {
  id: string;
  projectId: string;
  packageId?: string;
  documentNo: string;
  title: string;
  siteVisitDate: string;
  templateName: string;
  status: ReportStatus;
  createdBy: string;
  sections: ReportSection[];
  reviewComments?: string;
  generatedFileUrl?: string;
}

export interface DashboardFilters {
  projectId?: string;
  packageId?: string;
}

export interface IssueFilters extends DashboardFilters {
  statuses?: IssueStatus[];
  severities?: IssueSeverity[];
  search?: string;
}

export interface ReportFilters extends DashboardFilters {
  statuses?: ReportStatus[];
}

export interface DashboardMetrics {
  projectId?: string;
  packageId?: string;
  issues: {
    total: number;
    byStatus: Record<IssueStatus, number>;
    bySeverity: Record<IssueSeverity, number>;
    unresolvedCritical: number;
  };
  reports: {
    total: number;
    byStatus: Record<ReportStatus, number>;
  };
  generatedAt: string;
}
