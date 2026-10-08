import { describe, expect, it } from "vitest";
import { can, type SessionUser } from "./permissions";

const engineer: SessionUser = {
  id: "u1",
  name: "QC Engineer",
  email: "engineer@example.com",
  projectPermissions: {
    p1: ["issue:create", "issue:update", "report:create", "report:submit"],
  },
};

describe("project-scoped permissions", () => {
  it("allows an assigned permission in the correct project", () => {
    expect(can(engineer, "issue:create", "p1")).toBe(true);
  });

  it("does not leak permissions across projects or anonymous sessions", () => {
    expect(can(engineer, "issue:create", "p2")).toBe(false);
    expect(can(null, "issue:create", "p1")).toBe(false);
  });
});
