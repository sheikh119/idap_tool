import { z } from "zod";
import {
  assertProjectAccess,
  db,
  getReportRef,
  HttpError,
  type IdParams,
  isoDate,
  notFound,
  parseBody,
  patchSchema,
  requireActor,
  route,
  unwrap,
  uuid,
} from "@/lib/api/server";
import { EDITABLE_REPORT_STATUSES } from "@/lib/db/enums";

export const GET = route(async (_request, { params }: IdParams) => {
  const { id } = await params;
  const summary =
    unwrap(await db().from("v_report_summary").select("*").eq("report_id", id).maybeSingle()) ?? notFound("Report");

  const [report, sections, observations, history] = await Promise.all([
    db()
      .from("reports")
      .select("report_template_id, review_comments, template:report_templates(id, name, version, is_active)")
      .eq("id", id)
      .single(),
    db().from("report_sections").select("*").eq("report_id", id).order("display_order"),
    db().from("v_report_observations").select("*").eq("report_id", id).order("observation_display_order"),
    db()
      .from("report_history")
      .select("*, action_by_user:users(id, name, role_name)")
      .eq("report_id", id)
      .order("created_at"),
  ]);

  return {
    ...summary,
    ...unwrap<Record<string, unknown>>(report),
    sections: unwrap(sections),
    observations: unwrap(observations),
    history: unwrap(history),
  };
});

const updateReport = patchSchema({
  title: z.string().trim().min(1),
  site_visit_date: isoDate,
  report_template_id: uuid.nullable(),
  package_id: uuid.nullable(),
});

export const PATCH = route(async (request, { params }: IdParams) => {
  const { id } = await params;
  const actor = await requireActor(request);
  const body = await parseBody(request, updateReport);
  const report = await getReportRef(id);
  await assertProjectAccess(actor, report.project_id);

  if (!(EDITABLE_REPORT_STATUSES as readonly string[]).includes(report.status)) {
    throw new HttpError(422, `Report is ${report.status}; only DRAFT, REJECTED or REOPENED reports can be edited`, "NOT_EDITABLE");
  }

  if (body.package_id !== undefined && body.package_id !== report.package_id) {
    const linked = await db().from("report_issues").select("issue_id", { count: "exact", head: true }).eq("report_id", id);
    unwrap(linked);
    if (linked.count) {
      throw new HttpError(422, "Remove all observations before changing the report package", "HAS_OBSERVATIONS");
    }
  }

  unwrap(await db().from("reports").update(body).eq("id", id).select("id").single());
  return unwrap(await db().from("v_report_summary").select("*").eq("report_id", id).single());
});
