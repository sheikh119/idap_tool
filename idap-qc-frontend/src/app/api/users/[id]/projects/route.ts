import { z } from "zod";
import { db, type IdParams, parseBody, route, unwrap, uuid } from "@/lib/api/server";

export const GET = route(async (_request, { params }: IdParams) => {
  const { id } = await params;
  return unwrap(await db().from("v_user_project_access").select("*").eq("user_id", id).order("project_code"));
});

const assignment = z.object({ project_id: uuid, is_active: z.boolean().default(true) }).strict();

/** Assigns the user to a project, or re-enables / disables an existing assignment. */
export const POST = route(async (request, { params }: IdParams) => {
  const { id } = await params;
  const body = await parseBody(request, assignment);
  return unwrap(
    await db()
      .from("user_projects")
      .upsert({ user_id: id, ...body }, { onConflict: "user_id,project_id" })
      .select()
      .single(),
  );
});
