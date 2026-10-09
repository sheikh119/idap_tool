import { z } from "zod";
import { boolParam, db, type IdParams, optionalText, param, parseBody, route, unwrap, uuid } from "@/lib/api/server";
import { LOCATION_TYPES } from "@/lib/db/enums";

export const GET = route(async (request, { params }: IdParams) => {
  const { id } = await params;
  let query = db().from("v_site_location_hierarchy").select("*").eq("project_id", id).order("full_path");
  const packageId = param(request, "package_id");
  const type = param(request, "type");
  const active = boolParam(request, "active");
  if (packageId) query = query.eq("package_id", packageId);
  if (type) query = query.eq("location_type", type);
  if (active !== undefined) query = query.eq("is_active", active);
  return unwrap(await query);
});

const createLocation = z
  .object({
    name: z.string().trim().min(1),
    location_code: optionalText,
    location_type: z.enum(LOCATION_TYPES).optional(),
    description: optionalText,
    package_id: uuid.nullable().optional(),
    parent_location_id: uuid.nullable().optional(),
  })
  .strict();

export const POST = route(async (request, { params }: IdParams) => {
  const { id } = await params;
  const body = await parseBody(request, createLocation);
  const created = unwrap(await db().from("site_locations").insert({ ...body, project_id: id }).select("id").single());
  return unwrap(await db().from("v_site_location_hierarchy").select("*").eq("location_id", created.id).single());
}, 201);
