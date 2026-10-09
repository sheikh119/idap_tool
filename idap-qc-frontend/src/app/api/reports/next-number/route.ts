import { db, HttpError, param, route, unwrap } from "@/lib/api/server";

export const GET = route(async (request) => {
  const projectId = param(request, "project_id");
  if (!projectId) throw new HttpError(400, "project_id is required", "VALIDATION");
  const visitDate = param(request, "visit_date") ?? new Date().toISOString().slice(0, 10);
  const documentNo = unwrap<string>(
    await db().rpc("fn_next_report_number", { p_project_id: projectId, p_visit_date: visitDate }),
  );
  return { document_no: documentNo };
});
