import { z } from "zod";
import {
  assertProjectAccess,
  db,
  getReportRef,
  type IdParams,
  optionalText,
  parseBody,
  requireActor,
  route,
  unwrap,
  uuid,
} from "@/lib/api/server";
import { REPORT_SECTION_TYPES } from "@/lib/db/enums";

export const GET = route(async (_request, { params }: IdParams) => {
  const { id } = await params;
  return unwrap(await db().from("report_sections").select("*").eq("report_id", id).order("display_order"));
});

const createSection = z
  .object({
    section_type: z.enum(REPORT_SECTION_TYPES),
    heading: optionalText,
    body_text: optionalText,
    parent_section_id: uuid.nullable().optional(),
    site_location_id: uuid.nullable().optional(),
    display_order: z.number().int().positive().optional(),
  })
  .strict();

/** display_order is auto-assigned when omitted; the DB rejects changes unless the report is editable. */
export const POST = route(async (request, { params }: IdParams) => {
  const { id } = await params;
  const actor = await requireActor(request);
  const body = await parseBody(request, createSection);
  const report = await getReportRef(id);
  await assertProjectAccess(actor, report.project_id);
  return unwrap(await db().from("report_sections").insert({ ...body, report_id: id }).select().single());
}, 201);
