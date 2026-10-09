import { z } from "zod";
import {
  assertProjectAccess,
  db,
  getReportRef,
  notFound,
  optionalText,
  type Params,
  parseBody,
  patchSchema,
  requireActor,
  route,
  unwrap,
  uuid,
} from "@/lib/api/server";
import { REPORT_SECTION_TYPES } from "@/lib/db/enums";

type SectionParams = Params<{ id: string; sectionId: string }>;

const updateSection = patchSchema({
  section_type: z.enum(REPORT_SECTION_TYPES),
  heading: optionalText,
  body_text: optionalText,
  parent_section_id: uuid.nullable(),
  site_location_id: uuid.nullable(),
  display_order: z.number().int().positive(),
});

export const PATCH = route(async (request, { params }: SectionParams) => {
  const { id, sectionId } = await params;
  const actor = await requireActor(request);
  const body = await parseBody(request, updateSection);
  const report = await getReportRef(id);
  await assertProjectAccess(actor, report.project_id);
  return (
    unwrap(
      await db().from("report_sections").update(body).eq("id", sectionId).eq("report_id", id).select().maybeSingle(),
    ) ?? notFound("Section")
  );
});

/** Child sections are deleted too; observations in the section become unsectioned. */
export const DELETE = route(async (request, { params }: SectionParams) => {
  const { id, sectionId } = await params;
  const actor = await requireActor(request);
  const report = await getReportRef(id);
  await assertProjectAccess(actor, report.project_id);
  return (
    unwrap(await db().from("report_sections").delete().eq("id", sectionId).eq("report_id", id).select().maybeSingle()) ??
    notFound("Section")
  );
});
