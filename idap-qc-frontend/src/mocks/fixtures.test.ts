import { describe, expect, it } from "vitest";
import { buildDashboardMetrics, filterIssues, filterReports, issues, locations, reports } from "./fixtures";

describe("list filters agree with dashboard counts", () => {
  it("returns exactly the issues and reports each dashboard number counts", () => {
    const metrics = buildDashboardMetrics({ projectId: "p1" });

    expect(filterIssues({ projectId: "p1", statuses: ["OPEN"] })).toHaveLength(metrics.issues.byStatus.OPEN);
    expect(
      filterIssues({ projectId: "p1", severities: ["CRITICAL"], statuses: ["OPEN", "IN_PROGRESS"] }),
    ).toHaveLength(metrics.issues.unresolvedCritical);
    expect(filterReports({ projectId: "p1", statuses: ["SUBMITTED", "UNDER_REVIEW"] })).toHaveLength(
      metrics.reports.byStatus.SUBMITTED + metrics.reports.byStatus.UNDER_REVIEW,
    );
  });

  it("searches title, description, and location without case sensitivity", () => {
    expect(filterIssues({ projectId: "p1", search: "PLASTER" }).map((item) => item.id)).toEqual(["i2"]);
    expect(filterIssues({ projectId: "p1", search: "ground floor" }).map((item) => item.id)).toEqual(["i1"]);
    expect(filterIssues({ projectId: "p1", search: "nothing matches" })).toHaveLength(0);
  });
});

describe("buildDashboardMetrics", () => {
  it("derives counts from the project's issues and reports", () => {
    const metrics = buildDashboardMetrics({ projectId: "p1" });
    const projectIssues = issues.filter((item) => item.projectId === "p1");
    const projectReports = reports.filter((item) => item.projectId === "p1");

    expect(metrics.issues.total).toBe(projectIssues.length);
    expect(metrics.reports.total).toBe(projectReports.length);
    expect(Object.values(metrics.issues.byStatus).reduce((a, b) => a + b, 0)).toBe(projectIssues.length);
    expect(Object.values(metrics.issues.bySeverity).reduce((a, b) => a + b, 0)).toBe(projectIssues.length);
    expect(metrics.issues.byStatus.OPEN).toBe(projectIssues.filter((item) => item.status === "OPEN").length);
  });

  it("returns zeros for a project with no records", () => {
    const metrics = buildDashboardMetrics({ projectId: "new-project" });

    expect(metrics.issues.total).toBe(0);
    expect(metrics.issues.unresolvedCritical).toBe(0);
    expect(metrics.reports.byStatus.APPROVED).toBe(0);
  });

  it("counts only open or in-progress critical issues as unresolved", () => {
    const resolved = { ...issues[0], id: "resolved-critical", severity: "CRITICAL" as const, status: "RESOLVED" as const };
    issues.push(resolved);
    try {
      const metrics = buildDashboardMetrics({ projectId: resolved.projectId });
      expect(metrics.issues.bySeverity.CRITICAL).toBeGreaterThan(metrics.issues.unresolvedCritical);
    } finally {
      issues.pop();
    }
  });

  it("filters issues by the package of their location and reports by their own package", () => {
    const structural = buildDashboardMetrics({ projectId: "p1", packageId: "pk1" });
    const finishing = buildDashboardMetrics({ projectId: "p1", packageId: "pk2" });
    const whole = buildDashboardMetrics({ projectId: "p1" });

    expect(structural.issues.total + finishing.issues.total).toBeLessThanOrEqual(whole.issues.total);
    expect(structural.issues.total).toBe(1);
    expect(finishing.issues.total).toBe(1);
    expect(structural.reports.total).toBe(reports.filter((item) => item.packageId === "pk1").length);
    expect(finishing.reports.total).toBe(0);
  });

  it("inherits the package from a parent location", () => {
    const room = { id: "room-test", projectId: "p1", parentId: "l2", name: "Room 1", code: "R1", type: "ROOM" as const };
    const issue = { ...issues[0], id: "room-issue", locationId: room.id };
    locations.push(room);
    issues.push(issue);
    try {
      expect(buildDashboardMetrics({ projectId: "p1", packageId: "pk1" }).issues.total).toBe(2);
    } finally {
      issues.pop();
      locations.pop();
    }
  });
});
