import { z } from "zod";
import {
  assertProjectAccess,
  db,
  getReportRef,
  notFound,
  type Params,
  parseBody,
  patchSchema,
  requireActor,
  route,
  unwrap,
  uuid,
} from "@/lib/api/server";

type ObservationParams = Params<{ id: string; issueId: string }>;

const updateObservation = patchSchema({
  section_id: uuid.nullable(),
  observation_no: z.number().int().positive(),
  display_order: z.number().int().positive(),
});

export const PATCH = route(async (request, { params }: ObservationParams) => {
  const { id, issueId } = await params;
  const actor = await requireActor(request);
  const body = await parseBody(request, updateObservation);
  const report = await getReportRef(id);
  await assertProjectAccess(actor, report.project_id);
  return (
    unwrap(
      await db().from("report_issues").update(body).eq("report_id", id).eq("issue_id", issueId).select().maybeSingle(),
    ) ?? notFound("Observation")
  );
});

export const DELETE = route(async (request, { params }: ObservationParams) => {
  const { id, issueId } = await params;
  const actor = await requireActor(request);
  const report = await getReportRef(id);
  await assertProjectAccess(actor, report.project_id);
  return (
    unwrap(
      await db().from("report_issues").delete().eq("report_id", id).eq("issue_id", issueId).select().maybeSingle(),
    ) ?? notFound("Observation")
  );
});
