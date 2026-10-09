import { z } from "zod";
import { boolParam, db, type IdParams, optionalText, parseBody, route, unwrap } from "@/lib/api/server";
import { PACKAGE_STATUSES } from "@/lib/db/enums";

export const GET = route(async (request, { params }: IdParams) => {
  const { id } = await params;
  let query = db().from("packages").select("*").eq("project_id", id).order("package_code");
  const active = boolParam(request, "active");
  if (active !== undefined) query = query.eq("is_active", active);
  return unwrap(await query);
});

const createPackage = z
  .object({
    package_code: z.string().trim().min(1),
    name: z.string().trim().min(1),
    description: optionalText,
    status: z.enum(PACKAGE_STATUSES).optional(),
  })
  .strict();

export const POST = route(async (request, { params }: IdParams) => {
  const { id } = await params;
  const body = await parseBody(request, createPackage);
  return unwrap(await db().from("packages").insert({ ...body, project_id: id }).select().single());
}, 201);
