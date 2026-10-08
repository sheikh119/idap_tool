import { describe, expect, it } from "vitest";
import { ISSUE_STATUSES } from "./statuses";
import { parseList, routes } from "./routes";

describe("routes", () => {
  it("builds readable filtered URLs and omits empty filters", () => {
    expect(routes.issues("p1")).toBe("/projects/p1/issues");
    expect(routes.issues("p1", { package: undefined, status: [] })).toBe("/projects/p1/issues");
    expect(routes.issues("p1", { status: ["OPEN", "IN_PROGRESS"] })).toBe("/projects/p1/issues?status=OPEN,IN_PROGRESS");
  });

  it("parses lists back, dropping unknown values", () => {
    expect(parseList("OPEN,IN_PROGRESS", ISSUE_STATUSES)).toEqual(["OPEN", "IN_PROGRESS"]);
    expect(parseList("OPEN,bogus", ISSUE_STATUSES)).toEqual(["OPEN"]);
    expect(parseList(null, ISSUE_STATUSES)).toEqual([]);
  });
});
