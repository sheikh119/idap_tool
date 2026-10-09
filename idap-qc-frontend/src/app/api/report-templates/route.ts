import { boolParam, db, route, unwrap } from "@/lib/api/server";

export const GET = route(async (request) => {
  let query = db().from("report_templates").select("*").order("name").order("version");
  const active = boolParam(request, "active");
  if (active !== undefined) query = query.eq("is_active", active);
  return unwrap(await query);
});
