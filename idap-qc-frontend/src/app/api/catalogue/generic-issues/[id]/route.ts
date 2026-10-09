import { z } from "zod";
import { db, type IdParams, notFound, optionalText, parseBody, patchSchema, route, unwrap, uuid } from "@/lib/api/server";
import { DB_ISSUE_SEVERITIES } from "@/lib/db/enums";

const SELECT = "*, category:issue_categories(id, code, name, is_active)";

export const GET = route(async (_request, { params }: IdParams) => {
  const { id } = await params;
  const genericIssue =
    unwrap(await db().from("generic_issues").select(SELECT).eq("id", id).maybeSingle()) ?? notFound("Generic issue");
  const children = unwrap(
    await db().from("generic_issues").select("id, issue_code, title, is_active").eq("parent_issue_id", id).order("issue_code"),
  );
  return { ...genericIssue, children };
});

/** Editing a template never changes issues already created from it (they hold a snapshot). */
const updateGenericIssue = patchSchema({
  category_id: uuid,
  parent_issue_id: uuid.nullable(),
  issue_code: z.string().trim().min(1),
  title: z.string().trim().min(1),
  default_description: z.string().trim().min(1),
  default_root_cause: optionalText,
  default_risk_text: optionalText,
  default_severity: z.enum(DB_ISSUE_SEVERITIES).nullable(),
  is_active: z.boolean(),
});

export const PATCH = route(async (request, { params }: IdParams) => {
  const { id } = await params;
  const body = await parseBody(request, updateGenericIssue);
  return unwrap(await db().from("generic_issues").update(body).eq("id", id).select(SELECT).single());
});
