import { z } from "zod";
import { boolParam, db, optionalText, param, parseBody, route, searchPattern, unwrap, uuid } from "@/lib/api/server";
import { DB_ISSUE_SEVERITIES } from "@/lib/db/enums";

const SELECT = "*, category:issue_categories(id, code, name, is_active)";

export const GET = route(async (request) => {
  let query = db().from("generic_issues").select(SELECT).order("issue_code");
  const categoryId = param(request, "category_id");
  const parentId = param(request, "parent_id");
  const active = boolParam(request, "active");
  const q = param(request, "q");
  if (categoryId) query = query.eq("category_id", categoryId);
  if (parentId) query = parentId === "none" ? query.is("parent_issue_id", null) : query.eq("parent_issue_id", parentId);
  if (active !== undefined) query = query.eq("is_active", active);
  if (q) query = query.or(`title.ilike.${searchPattern(q)},issue_code.ilike.${searchPattern(q)}`);
  return unwrap(await query);
});

const createGenericIssue = z
  .object({
    category_id: uuid,
    parent_issue_id: uuid.nullable().optional(),
    issue_code: z.string().trim().min(1),
    title: z.string().trim().min(1),
    default_description: z.string().trim().min(1),
    default_root_cause: optionalText,
    default_risk_text: optionalText,
    default_severity: z.enum(DB_ISSUE_SEVERITIES).nullable().optional(),
  })
  .strict();

export const POST = route(async (request) => {
  const body = await parseBody(request, createGenericIssue);
  return unwrap(await db().from("generic_issues").insert(body).select(SELECT).single());
}, 201);
