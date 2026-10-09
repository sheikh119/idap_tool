// Fixed ids from src/db/qc_seed_data.sql.

const id = (prefix: string, n: number | string) => `${prefix}-${String(n).padStart(12, "0")}`;

export const SEED = {
  users: {
    tariqGM: id("11111111-1111-1111-1111", 1),
    nadiaGM: id("11111111-1111-1111-1111", 2),
    saraManager: id("11111111-1111-1111-1111", 3),
    bilalAM: id("11111111-1111-1111-1111", 4),
    ahsanAE: id("11111111-1111-1111-1111", 5),
    fatimaAE: id("11111111-1111-1111-1111", 6),
    usmanIC: id("11111111-1111-1111-1111", 7),
    kamranInactive: id("11111111-1111-1111-1111", 8),
    hiraNoProjects: id("11111111-1111-1111-1111", 9),
    zainabDisabledAssignment: id("11111111-1111-1111-1111", 10),
  },
  projects: {
    nze: id("22222222-2222-2222-2222", 1),
    rwp: id("22222222-2222-2222-2222", 2),
    mul: id("22222222-2222-2222-2222", 3),
    fsd: id("22222222-2222-2222-2222", 4),
  },
  packages: { str: id("33333333-3333-3333-3333", 11), fin: id("33333333-3333-3333-3333", 12) },
  locations: {
    nzeGroundFloor: id("44444444-4444-4444-4444", 104),
    nzeSecondFloor: id("44444444-4444-4444-4444", 106),
    nzeTempOfficeArchived: id("44444444-4444-4444-4444", 112),
  },
  genericIssues: { blockworkJoints: id("66666666-6666-6666-6666", 5), retired: id("66666666-6666-6666-6666", 20) },
  issues: {
    honeycombing: id("77777777-7777-7777-7777", 1),
    staircaseRailing: id("77777777-7777-7777-7777", 15),
    roadCracking: id("77777777-7777-7777-7777", 17),
  },
  reports: {
    r1Draft: id("99999999-9999-9999-9999", 1),
    r2Approved: id("99999999-9999-9999-9999", 2),
    r3Rejected: id("99999999-9999-9999-9999", 3),
    r4UnderReview: id("99999999-9999-9999-9999", 4),
    r5Submitted: id("99999999-9999-9999-9999", 5),
    r6Approved: id("99999999-9999-9999-9999", 6),
    r7Reopened: id("99999999-9999-9999-9999", 7),
    r8EmptyDraft: id("99999999-9999-9999-9999", 8),
  },
} as const;

export type Preset = {
  label: string;
  method: "GET" | "POST" | "PATCH" | "DELETE";
  path: string;
  body?: unknown;
  actor?: string;
  expect?: string;
};

const { users, projects, packages, locations, genericIssues, issues, reports } = SEED;

export const PRESETS: Preset[] = [
  { label: "Health / row counts", method: "GET", path: "/health" },
  { label: "List users", method: "GET", path: "/users" },
  { label: "User with project access", method: "GET", path: `/users/${users.saraManager}` },
  { label: "List projects", method: "GET", path: "/projects" },
  { label: "NZE locations (hierarchy paths)", method: "GET", path: `/projects/${projects.nze}/locations` },
  { label: "Generic issues (active)", method: "GET", path: "/catalogue/generic-issues?active=true" },
  { label: "Open NZE issues", method: "GET", path: `/issues?project_id=${projects.nze}&status=OPEN,IN_PROGRESS` },
  { label: "Issues in FIN package", method: "GET", path: `/issues?package_id=${packages.fin}` },
  { label: "Issue detail + history", method: "GET", path: `/issues/${issues.honeycombing}` },
  {
    label: "Create issue from template (snapshot)",
    method: "POST",
    path: "/issues",
    actor: users.ahsanAE,
    body: { site_location_id: locations.nzeSecondFloor, generic_issue_id: genericIssues.blockworkJoints },
    expect: "201, title/description/severity copied from CIV-002",
  },
  {
    label: "Create freehand issue",
    method: "POST",
    path: "/issues",
    actor: users.ahsanAE,
    body: {
      site_location_id: locations.nzeGroundFloor,
      title: "Loose ceiling tile",
      description: "Ceiling tile displaced near lift lobby.",
      severity: "LOW",
    },
  },
  {
    label: "✗ Issue on archived location",
    method: "POST",
    path: "/issues",
    actor: users.ahsanAE,
    body: { site_location_id: locations.nzeTempOfficeArchived, title: "x", description: "x" },
    expect: "422 INACTIVE_LOCATION",
  },
  {
    label: "✗ Issue from retired template",
    method: "POST",
    path: "/issues",
    actor: users.ahsanAE,
    body: { site_location_id: locations.nzeGroundFloor, generic_issue_id: genericIssues.retired },
    expect: "422 generic_issue is inactive",
  },
  {
    label: "✗ Issue by user without project access",
    method: "POST",
    path: "/issues",
    actor: users.hiraNoProjects,
    body: { site_location_id: locations.nzeGroundFloor, title: "x", description: "x" },
    expect: "403 NO_PROJECT_ACCESS",
  },
  {
    label: "Change issue status with comment",
    method: "PATCH",
    path: `/issues/${issues.honeycombing}`,
    actor: users.ahsanAE,
    body: { status: "IN_PROGRESS", comment: "Contractor mobilised repair crew" },
  },
  {
    label: "✗ Edit text of issue in approved report",
    method: "PATCH",
    path: `/issues/${issues.honeycombing}`,
    actor: users.ahsanAE,
    body: { title: "Renamed" },
    expect: "422 frozen (issue is in approved R2)",
  },
  { label: "List NZE reports", method: "GET", path: `/reports?project_id=${projects.nze}` },
  { label: "Report detail (R1 draft)", method: "GET", path: `/reports/${reports.r1Draft}` },
  { label: "Report payload (R1)", method: "GET", path: `/reports/${reports.r1Draft}/payload` },
  { label: "Next document no (MUL-HOSP)", method: "GET", path: `/reports/next-number?project_id=${projects.mul}` },
  {
    label: "Create report with default sections",
    method: "POST",
    path: "/reports",
    actor: users.ahsanAE,
    body: { project_id: projects.nze, title: "Ad-hoc inspection", site_visit_date: "2026-10-09", with_default_sections: true },
  },
  {
    label: "Add observation to R1 (auto numbered)",
    method: "POST",
    path: `/reports/${reports.r1Draft}/issues`,
    actor: users.ahsanAE,
    body: { issue_id: issues.staircaseRailing },
  },
  {
    label: "✗ Add issue from another project",
    method: "POST",
    path: `/reports/${reports.r1Draft}/issues`,
    actor: users.ahsanAE,
    body: { issue_id: issues.roadCracking },
    expect: "422 project mismatch",
  },
  {
    label: "✗ Add issue to approved report",
    method: "POST",
    path: `/reports/${reports.r2Approved}/issues`,
    actor: users.ahsanAE,
    body: { issue_id: issues.staircaseRailing },
    expect: "422 cannot be edited",
  },
  {
    label: "Start review of R5 (Manager)",
    method: "POST",
    path: `/reports/${reports.r5Submitted}/workflow`,
    actor: users.saraManager,
    body: { action: "review" },
  },
  {
    label: "Approve R4 (GM)",
    method: "POST",
    path: `/reports/${reports.r4UnderReview}/workflow`,
    actor: users.tariqGM,
    body: { action: "approve", comment: "Approved" },
  },
  {
    label: "✗ Approve R4 as Manager",
    method: "POST",
    path: `/reports/${reports.r4UnderReview}/workflow`,
    actor: users.saraManager,
    body: { action: "approve" },
    expect: "422 Only GENERAL_MANAGER may approve",
  },
  {
    label: "✗ Reject without comment",
    method: "POST",
    path: `/reports/${reports.r4UnderReview}/workflow`,
    actor: users.saraManager,
    body: { action: "reject" },
    expect: "422 comment required",
  },
  {
    label: "✗ Submit empty report R8",
    method: "POST",
    path: `/reports/${reports.r8EmptyDraft}/workflow`,
    actor: users.fatimaAE,
    body: { action: "submit" },
    expect: "422 at least one issue",
  },
  {
    label: "✗ Inactive user acts",
    method: "POST",
    path: `/reports/${reports.r5Submitted}/workflow`,
    actor: users.kamranInactive,
    body: { action: "review" },
    expect: "403 INACTIVE_USER",
  },
  {
    label: "✗ Edit approved report title",
    method: "PATCH",
    path: `/reports/${reports.r2Approved}`,
    actor: users.ahsanAE,
    body: { title: "Changed" },
    expect: "422 NOT_EDITABLE",
  },
  { label: "Dashboard (NZE)", method: "GET", path: `/dashboard?project_id=${projects.nze}` },
  { label: "Settings", method: "GET", path: "/settings" },
  {
    label: "Require images on submit",
    method: "PATCH",
    path: "/settings",
    body: { key: "require_issue_images_on_submit", value: true },
  },
];
