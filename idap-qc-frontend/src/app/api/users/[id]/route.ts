import { z } from "zod";
import { db, type IdParams, notFound, optionalText, parseBody, patchSchema, route, unwrap } from "@/lib/api/server";
import { ROLE_NAMES } from "@/lib/db/enums";

export const GET = route(async (_request, { params }: IdParams) => {
  const { id } = await params;
  const user = unwrap(await db().from("users").select("*").eq("id", id).maybeSingle()) ?? notFound("User");
  const projects = unwrap(
    await db().from("v_user_project_access").select("*").eq("user_id", id).order("project_code"),
  );
  return { ...user, projects };
});

const updateUser = patchSchema({
  name: z.string().trim().min(1),
  email: z.string().trim().email().nullable(),
  employee_id: optionalText,
  role_name: z.enum(ROLE_NAMES),
  department: z.string().trim().min(1),
  is_active: z.boolean(),
});

export const PATCH = route(async (request, { params }: IdParams) => {
  const { id } = await params;
  const body = await parseBody(request, updateUser);
  return unwrap(await db().from("users").update(body).eq("id", id).select().single());
});
