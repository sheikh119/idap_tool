import { z } from "zod";
import {
  assertProjectAccess,
  db,
  isoDate,
  listParam,
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

/** Filters: project_id, package_id, created_by, status (csv), from / to (site visit date), q, limit, offset. */
export const GET = route(async (request) => {
  const page = pageParams(request);
  let query = db()
    .from("v_report_summary")
    .select("*", { count: "exact" })
    .order("site_visit_date", { ascending: false })
    .order("document_no", { ascending: false });

  for (const name of ["project_id", "package_id", "created_by"]) {
    const value = param(request, name);
    if (value) query = query.eq(name, value);
  }
  const statuses = listParam(request, "status");
  const from = param(request, "from");
  const to = param(request, "to");
  const q = param(request, "q");
  if (statuses) query = query.in("status", statuses);
  if (from) query = query.gte("site_visit_date", from);
  if (to) query = query.lte("site_visit_date", to);
  if (q) query = query.or(`title.ilike.${searchPattern(q)},document_no.ilike.${searchPattern(q)}`);

  return pageResult(await query.range(page.from, page.to), page);
});

const createReport = z
  .object({
    project_id: uuid,
    package_id: uuid.nullable().optional(),
    report_template_id: uuid.nullable().optional(),
    title: z.string().trim().min(1),
    site_visit_date: isoDate,
    document_no: z.string().trim().min(1).optional(),
    with_default_sections: z.boolean().optional(),
  })
  .strict();

const DEFAULT_SECTIONS = [
  { section_type: "CRITICAL_OBSERVATIONS", heading: "CRITICAL OBSERVATIONS" },
  { section_type: "GENERAL_OBSERVATIONS", heading: "GENERAL OBSERVATIONS" },
  { section_type: "PROJECT_PROGRESS_SUBMITTAL_STATUS", heading: "PROJECT PROGRESS AND SUBMITTAL STATUS" },
  { section_type: "RISK_ASSESSMENT", heading: "RISK ASSESSMENT" },
  { section_type: "RECOMMENDATIONS", heading: "RECOMMENDATIONS" },
];

/** document_no is generated with fn_next_report_number when omitted. */
export const POST = route(async (request) => {
  const actor = await requireActor(request);
  const { with_default_sections, ...body } = await parseBody(request, createReport);
  await assertProjectAccess(actor, body.project_id);

  const documentNo =
    body.document_no ??
    unwrap<string>(
      await db().rpc("fn_next_report_number", { p_project_id: body.project_id, p_visit_date: body.site_visit_date }),
    );

  const created = unwrap(
    await db()
      .from("reports")
      .insert({ ...body, document_no: documentNo, created_by: actor.id })
      .select("id")
      .single(),
  );

  if (with_default_sections) {
    unwrap(
      await db()
        .from("report_sections")
        .insert(DEFAULT_SECTIONS.map((section, index) => ({ ...section, report_id: created.id, display_order: index + 1 }))),
    );
  }

  return unwrap(await db().from("v_report_summary").select("*").eq("report_id", created.id).single());
}, 201);
