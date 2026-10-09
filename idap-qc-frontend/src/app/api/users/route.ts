import { z } from "zod";
import { boolParam, db, optionalText, param, parseBody, route, unwrap } from "@/lib/api/server";
import { ROLE_NAMES } from "@/lib/db/enums";

export const GET = route(async (request) => {
  let query = db().from("users").select("*").order("name");
  const role = param(request, "role");
  const active = boolParam(request, "active");
  if (role) query = query.eq("role_name", role);
  if (active !== undefined) query = query.eq("is_active", active);
  return unwrap(await query);
});

const createUser = z
  .object({
    name: z.string().trim().min(1),
    email: z.string().trim().email().nullable().optional(),
    employee_id: optionalText,
    role_name: z.enum(ROLE_NAMES),
    department: z.string().trim().min(1).optional(),
    is_active: z.boolean().optional(),
  })
  .strict();

export const POST = route(async (request) => {
  const body = await parseBody(request, createUser);
  return unwrap(await db().from("users").insert(body).select().single());
}, 201);
