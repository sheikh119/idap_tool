import { z } from "zod";
import { db, type IdParams, notFound, optionalText, parseBody, patchSchema, route, unwrap } from "@/lib/api/server";
import { PACKAGE_STATUSES } from "@/lib/db/enums";

export const GET = route(async (_request, { params }: IdParams) => {
  const { id } = await params;
  return unwrap(await db().from("packages").select("*").eq("id", id).maybeSingle()) ?? notFound("Package");
});

const updatePackage = patchSchema({
  package_code: z.string().trim().min(1),
  name: z.string().trim().min(1),
  description: optionalText,
  status: z.enum(PACKAGE_STATUSES),
  is_active: z.boolean(),
});

export const PATCH = route(async (request, { params }: IdParams) => {
  const { id } = await params;
  const body = await parseBody(request, updatePackage);
  return unwrap(await db().from("packages").update(body).eq("id", id).select().single());
});
