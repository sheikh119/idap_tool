import { db, route, unwrap } from "@/lib/api/server";

const TABLES = [
  "users",
  "user_projects",
  "projects",
  "packages",
  "site_locations",
  "issue_categories",
  "generic_issues",
  "issues",
  "issue_history",
  "issue_images",
  "report_templates",
  "reports",
  "report_sections",
  "report_issues",
  "report_history",
] as const;

export const GET = route(async () => {
  const counts = await Promise.all(
    TABLES.map(async (table) => {
      const result = await db().from(table).select("*", { count: "exact", head: true });
      unwrap(result);
      return [table, result.count ?? 0] as const;
    }),
  );
  return { ok: true, counts: Object.fromEntries(counts) };
});
