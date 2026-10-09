import { assertProjectAccess, db, getReportRef, type IdParams, requireActor, route, unwrap } from "@/lib/api/server";

/** Renumbers observations 1..N in report output order (section order, then observation order). */
export const POST = route(async (request, { params }: IdParams) => {
  const { id } = await params;
  const actor = await requireActor(request);
  const report = await getReportRef(id);
  await assertProjectAccess(actor, report.project_id);
  return unwrap(await db().rpc("api_renumber_observations", { p_report_id: id }));
});
