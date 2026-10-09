import { z } from "zod";
import {
  assertProjectAccess,
  db,
  HttpError,
  listParam,
  notFound,
  optionalText,
  pageParams,
  pageResult,
  param,
  parseBody,
  requireActor,
  route,
  searchPattern,
  unwrap,
  uuid,
} from "@/lib/api/server";
import { DB_ISSUE_SEVERITIES } from "@/lib/db/enums";

/**
 * Filters: project_id, package_id, location_id, category_id, generic_issue_id, reported_by,
 * status (csv), severity (csv), from / to (observed date), q (title/description/location),
 * not_in_report (exclude issues already in that report), limit, offset.
 */
export const GET = route(async (request) => {
  const page = pageParams(request);
  let query = db()
    .from("v_issue_details")
    .select("*", { count: "exact" })
    .order("observed_at", { ascending: false });

  const filters: [string, string][] = [
    ["project_id", "project_id"],
    ["package_id", "package_id"],
    ["location_id", "site_location_id"],
    ["category_id", "category_id"],
    ["generic_issue_id", "generic_issue_id"],
    ["reported_by", "reported_by"],
  ];
  for (const [name, column] of filters) {
    const value = param(request, name);
    if (value) query = query.eq(column, value);
  }

  const statuses = listParam(request, "status");
  const severities = listParam(request, "severity");
  const from = param(request, "from");
  const to = param(request, "to");
  const q = param(request, "q");
  const notInReport = param(request, "not_in_report");

  if (statuses) query = query.in("status", statuses);
  if (severities) query = query.in("severity", severities);
  if (from) query = query.gte("observed_at", from);
  if (to) query = query.lte("observed_at", `${to}T23:59:59.999Z`);
  if (q) {
    const pattern = searchPattern(q);
    query = query.or(`title.ilike.${pattern},description.ilike.${pattern},location_path.ilike.${pattern}`);
  }
  if (notInReport) {
    const linked = unwrap<{ issue_id: string }[]>(
      await db().from("report_issues").select("issue_id").eq("report_id", notInReport),
    );
    if (linked.length) query = query.not("issue_id", "in", `(${linked.map((row) => row.issue_id).join(",")})`);
  }

  return pageResult(await query.range(page.from, page.to), page);
});

const createIssue = z
  .object({
    site_location_id: uuid,
    generic_issue_id: uuid.nullable().optional(),
    title: z.string().trim().min(1).optional(),
    description: z.string().trim().min(1).optional(),
    root_cause: optionalText,
    risk_description: optionalText,
    severity: z.enum(DB_ISSUE_SEVERITIES).optional(),
    location_details: optionalText,
    observed_at: z.string().min(1).optional(),
  })
  .strict()
  .superRefine((value, ctx) => {
    if (value.generic_issue_id) return;
    for (const field of ["title", "description"] as const) {
      if (!value[field]) {
        ctx.addIssue({ code: "custom", path: [field], message: "Required when no generic issue is selected" });
      }
    }
  });

/** Omitted title/description/root cause/risk/severity are copied from the generic issue by a DB trigger. */
export const POST = route(async (request) => {
  const actor = await requireActor(request);
  const body = await parseBody(request, createIssue);

  const location =
    unwrap<{ project_id: string; is_active: boolean } | null>(
      await db().from("site_locations").select("project_id, is_active").eq("id", body.site_location_id).maybeSingle(),
    ) ?? notFound("Site location");
  if (!location.is_active) throw new HttpError(422, "Site location is archived", "INACTIVE_LOCATION");
  await assertProjectAccess(actor, location.project_id);

  const created = unwrap(
    await db()
      .from("issues")
      .insert({ ...body, reported_by: actor.id })
      .select("id")
      .single(),
  );
  return unwrap(await db().from("v_issue_details").select("*").eq("issue_id", created.id).single());
}, 201);
