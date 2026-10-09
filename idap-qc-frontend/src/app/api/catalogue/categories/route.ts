import { z } from "zod";
import { boolParam, db, optionalText, parseBody, route, unwrap } from "@/lib/api/server";

export const GET = route(async (request) => {
  let query = db().from("issue_categories").select("*, generic_issues(count)").order("code");
  const active = boolParam(request, "active");
  if (active !== undefined) query = query.eq("is_active", active);
  return unwrap(await query);
});

const createCategory = z
  .object({
    code: z.string().trim().min(1),
    name: z.string().trim().min(1),
    description: optionalText,
  })
  .strict();

export const POST = route(async (request) => {
  const body = await parseBody(request, createCategory);
  return unwrap(await db().from("issue_categories").insert(body).select().single());
}, 201);
