import { z } from "zod";
import { db, type IdParams, isoDate, notFound, optionalText, parseBody, patchSchema, route, unwrap } from "@/lib/api/server";
import { PROJECT_STATUSES } from "@/lib/db/enums";

export const GET = route(async (_request, { params }: IdParams) => {
  const { id } = await params;
  const project = unwrap(await db().from("projects").select("*").eq("id", id).maybeSingle()) ?? notFound("Project");
  const packages = unwrap(await db().from("packages").select("*").eq("project_id", id).order("package_code"));
  return { ...project, packages };
});

const updateProject = patchSchema({
  project_code: z.string().trim().min(1),
  name: z.string().trim().min(1),
  description: optionalText,
  status: z.enum(PROJECT_STATUSES),
  start_date: isoDate.nullable(),
  end_date: isoDate.nullable(),
  is_active: z.boolean(),
});

export const PATCH = route(async (request, { params }: IdParams) => {
  const { id } = await params;
  const body = await parseBody(request, updateProject);
  return unwrap(await db().from("projects").update(body).eq("id", id).select().single());
});
