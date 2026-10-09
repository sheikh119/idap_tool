import { z } from "zod";
import { boolParam, db, isoDate, optionalText, param, parseBody, route, searchPattern, unwrap } from "@/lib/api/server";
import { PROJECT_STATUSES } from "@/lib/db/enums";

export const GET = route(async (request) => {
  let query = db().from("projects").select("*, packages(count)").order("project_code");
  const status = param(request, "status");
  const active = boolParam(request, "active");
  const q = param(request, "q");
  if (status) query = query.eq("status", status);
  if (active !== undefined) query = query.eq("is_active", active);
  if (q) query = query.or(`name.ilike.${searchPattern(q)},project_code.ilike.${searchPattern(q)}`);
  return unwrap(await query);
});

const createProject = z
  .object({
    project_code: z.string().trim().min(1),
    name: z.string().trim().min(1),
    description: optionalText,
    status: z.enum(PROJECT_STATUSES).optional(),
    start_date: isoDate.nullable().optional(),
    end_date: isoDate.nullable().optional(),
  })
  .strict();

export const POST = route(async (request) => {
  const body = await parseBody(request, createProject);
  return unwrap(await db().from("projects").insert(body).select().single());
}, 201);
