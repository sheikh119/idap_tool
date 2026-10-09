import { db, type IdParams, notFound, route, unwrap } from "@/lib/api/server";

/** Ordered sections, observations and image references used for document generation. */
export const GET = route(async (_request, { params }: IdParams) => {
  const { id } = await params;
  return unwrap(await db().rpc("fn_report_payload", { p_report_id: id })) ?? notFound("Report");
});
