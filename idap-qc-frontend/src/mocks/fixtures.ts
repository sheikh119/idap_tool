import { ISSUE_SEVERITIES, ISSUE_STATUSES, REPORT_STATUSES } from "@/constants/statuses";
import type {
  DashboardFilters,
  DashboardMetrics,
  GenericIssue,
  Issue,
  IssueFilters,
  Project,
  ProjectPackage,
  Report,
  ReportFilters,
  SiteLocation,
} from "@/types/domain";

export const projects: Project[] = [
  { id: "p1", code: "NZE-LHR", name: "Net Zero Energy Building Lahore", status: "ACTIVE", openIssues: 8 },
  { id: "p2", code: "RWP-ROAD", name: "Rawalpindi Road Rehabilitation", status: "ACTIVE", openIssues: 3 },
];

export const packages: ProjectPackage[] = [
  { id: "pk1", projectId: "p1", code: "STR", name: "Structural works", status: "ACTIVE" },
  { id: "pk2", projectId: "p1", code: "FIN", name: "Finishing works", status: "ACTIVE" },
  { id: "pk3", projectId: "p2", code: "PAV", name: "Pavement works", status: "ACTIVE" },
];

export const locations: SiteLocation[] = [
  { id: "l1", projectId: "p1", name: "Main Building", code: "MB", type: "BUILDING" },
  { id: "l2", projectId: "p1", packageId: "pk1", parentId: "l1", name: "Ground Floor", code: "GF", type: "FLOOR" },
  { id: "l3", projectId: "p1", packageId: "pk2", parentId: "l1", name: "First Floor", code: "FF", type: "FLOOR" },
  { id: "l4", projectId: "p1", name: "External Works", code: "EXT", type: "OTHER" },
];

export const genericIssues: GenericIssue[] = [
  {
    id: "g1",
    code: "CIV-001",
    category: "Civil",
    title: "Honeycombing in concrete",
    defaultDescription: "Concrete surface contains visible voids and exposed aggregate. Repair the affected area using an approved method statement.",
    defaultRootCause: "Insufficient compaction during concrete placement.",
    defaultRisk: "May reduce durability and expose reinforcement to moisture.",
    defaultSeverity: "HIGH",
  },
  {
    id: "g2",
    code: "ARC-004",
    category: "Architectural",
    title: "Uneven plaster finish",
    defaultDescription: "Wall plaster is uneven and does not meet the approved finish tolerance. Rectify and obtain QC acceptance.",
    defaultSeverity: "MEDIUM",
  },
];

export const issues: Issue[] = [
  {
    id: "i1",
    projectId: "p1",
    locationId: "l2",
    locationName: "Main Building / Ground Floor",
    title: "Honeycombing in concrete column",
    description: "Voids are visible on the east face of column C-12. Repair using the approved procedure.",
    rootCause: "Insufficient vibration.",
    riskDescription: "Reduced durability and possible reinforcement exposure.",
    severity: "CRITICAL",
    status: "OPEN",
    reporter: "Ahsan Khan",
    observedAt: "2026-10-05",
    images: [],
  },
  {
    id: "i2",
    projectId: "p1",
    locationId: "l3",
    locationName: "Main Building / First Floor",
    title: "Uneven plaster finish",
    description: "Wall finish is outside the accepted tolerance near room 104.",
    severity: "MEDIUM",
    status: "IN_PROGRESS",
    reporter: "Ahsan Khan",
    observedAt: "2026-10-06",
    images: [],
  },
];

export const reports: Report[] = [
  {
    id: "r1",
    projectId: "p1",
    documentNo: "QC-NZE-2026-014",
    title: "Weekly Site Quality Inspection",
    siteVisitDate: "2026-10-06",
    templateName: "IDAP Standard QC Report v1",
    status: "DRAFT",
    createdBy: "Ahsan Khan",
    sections: [
      { id: "s1", type: "CRITICAL", heading: "Critical Observations", issueIds: ["i1"] },
      { id: "s2", type: "GENERAL", heading: "General Observations", issueIds: ["i2"] },
    ],
  },
  {
    id: "r2",
    projectId: "p1",
    packageId: "pk1",
    documentNo: "QC-NZE-2026-013",
    title: "Site Quality Inspection",
    siteVisitDate: "2026-09-28",
    templateName: "IDAP Standard QC Report v1",
    status: "APPROVED",
    createdBy: "Sara Ali",
    sections: [],
    generatedFileUrl: "#",
  },
];

function countBy<T, K extends string>(items: T[], keys: readonly K[], pick: (item: T) => K) {
  const counts = Object.fromEntries(keys.map((key) => [key, 0])) as Record<K, number>;
  for (const item of items) counts[pick(item)] += 1;
  return counts;
}

function locationPackageId(locationId: string): string | undefined {
  const visited = new Set<string>();
  let current = locations.find((item) => item.id === locationId);
  while (current && !visited.has(current.id)) {
    if (current.packageId) return current.packageId;
    visited.add(current.id);
    current = current.parentId ? locations.find((item) => item.id === current?.parentId) : undefined;
  }
  return undefined;
}

export function filterIssues({ projectId, packageId, statuses, severities, search }: IssueFilters = {}) {
  const term = search?.trim().toLowerCase();
  return issues.filter(
    (item) =>
      (!projectId || item.projectId === projectId) &&
      (!packageId || locationPackageId(item.locationId) === packageId) &&
      (!statuses?.length || statuses.includes(item.status)) &&
      (!severities?.length || severities.includes(item.severity)) &&
      (!term ||
        [item.title, item.description, item.locationName].some((text) => text.toLowerCase().includes(term))),
  );
}

export function filterReports({ projectId, packageId, statuses }: ReportFilters = {}) {
  return reports.filter(
    (item) =>
      (!projectId || item.projectId === projectId) &&
      (!packageId || item.packageId === packageId) &&
      (!statuses?.length || statuses.includes(item.status)),
  );
}

export function buildDashboardMetrics({ projectId, packageId }: DashboardFilters = {}): DashboardMetrics {
  const scopedIssues = filterIssues({ projectId, packageId });
  const scopedReports = filterReports({ projectId, packageId });

  return {
    projectId,
    packageId,
    issues: {
      total: scopedIssues.length,
      byStatus: countBy(scopedIssues, ISSUE_STATUSES, (item) => item.status),
      bySeverity: countBy(scopedIssues, ISSUE_SEVERITIES, (item) => item.severity),
      unresolvedCritical: scopedIssues.filter(
        (item) => item.severity === "CRITICAL" && (item.status === "OPEN" || item.status === "IN_PROGRESS"),
      ).length,
    },
    reports: {
      total: scopedReports.length,
      byStatus: countBy(scopedReports, REPORT_STATUSES, (item) => item.status),
    },
    generatedAt: new Date().toISOString(),
  };
}
