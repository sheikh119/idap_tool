import { z } from "zod";
import { db, type IdParams, optionalText, parseBody, patchSchema, route, unwrap } from "@/lib/api/server";

const updateCategory = patchSchema({
  code: z.string().trim().min(1),
  name: z.string().trim().min(1),
  description: optionalText,
  is_active: z.boolean(),
});

export const PATCH = route(async (request, { params }: IdParams) => {
  const { id } = await params;
  const body = await parseBody(request, updateCategory);
  return unwrap(await db().from("issue_categories").update(body).eq("id", id).select().single());
});
