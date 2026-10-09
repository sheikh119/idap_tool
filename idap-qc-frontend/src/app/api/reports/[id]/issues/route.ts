import { z } from "zod";
import {
  assertProjectAccess,
  db,
  getReportRef,
  type IdParams,
  parseBody,
  requireActor,
  route,
  unwrap,
  uuid,
} from "@/lib/api/server";

export const GET = route(async (_request, { params }: IdParams) => {
  const { id } = await params;
  return unwrap(
    await db().from("v_report_observations").select("*").eq("report_id", id).order("observation_display_order"),
  );
});

const addObservation = z
  .object({
    issue_id: uuid,
    section_id: uuid.nullable().optional(),
    observation_no: z.number().int().positive().optional(),
    display_order: z.number().int().positive().optional(),
  })
  .strict();

/** observation_no / display_order are auto-assigned when omitted; the DB checks project/package scope. */
export const POST = route(async (request, { params }: IdParams) => {
  const { id } = await params;
  const actor = await requireActor(request);
  const body = await parseBody(request, addObservation);
  const report = await getReportRef(id);
  await assertProjectAccess(actor, report.project_id);
  return unwrap(await db().from("report_issues").insert({ ...body, report_id: id }).select().single());
}, 201);
