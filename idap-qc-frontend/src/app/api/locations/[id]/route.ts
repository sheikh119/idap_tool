import { z } from "zod";
import { db, type IdParams, notFound, optionalText, parseBody, patchSchema, route, unwrap, uuid } from "@/lib/api/server";
import { LOCATION_TYPES } from "@/lib/db/enums";

export const GET = route(async (_request, { params }: IdParams) => {
  const { id } = await params;
  return (
    unwrap(await db().from("v_site_location_hierarchy").select("*").eq("location_id", id).maybeSingle()) ??
    notFound("Location")
  );
});

const updateLocation = patchSchema({
  name: z.string().trim().min(1),
  location_code: optionalText,
  location_type: z.enum(LOCATION_TYPES),
  description: optionalText,
  package_id: uuid.nullable(),
  parent_location_id: uuid.nullable(),
  is_active: z.boolean(),
});

export const PATCH = route(async (request, { params }: IdParams) => {
  const { id } = await params;
  const body = await parseBody(request, updateLocation);
  unwrap(await db().from("site_locations").update(body).eq("id", id).select("id").single());
  return unwrap(await db().from("v_site_location_hierarchy").select("*").eq("location_id", id).single());
});
