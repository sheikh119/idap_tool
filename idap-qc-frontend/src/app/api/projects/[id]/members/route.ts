import { db, type IdParams, route, unwrap } from "@/lib/api/server";

export const GET = route(async (_request, { params }: IdParams) => {
  const { id } = await params;
  return unwrap(await db().from("v_user_project_access").select("*").eq("project_id", id).order("user_name"));
});
