import { z } from "zod";
import {
  assertProjectAccess,
  db,
  type IdParams,
  notFound,
  optionalText,
  parseBody,
  requireActor,
  route,
  unwrap,
  uuid,
} from "@/lib/api/server";
import { DB_ISSUE_SEVERITIES, DB_ISSUE_STATUSES } from "@/lib/db/enums";

async function getIssueDetails(id: string) {
  return unwrap(await db().from("v_issue_details").select("*").eq("issue_id", id).maybeSingle()) ?? notFound("Issue");
}

export const GET = route(async (_request, { params }: IdParams) => {
  const { id } = await params;
  const [issue, history, images, reports] = await Promise.all([
    getIssueDetails(id),
    db()
      .from("issue_history")
      .select("*, changed_by_user:users(id, name, role_name)")
      .eq("issue_id", id)
      .order("created_at"),
    db().from("issue_images").select("*").eq("issue_id", id).order("display_order"),
    db()
      .from("report_issues")
      .select("observation_no, display_order, section_id, report:reports(id, document_no, title, status, site_visit_date)")
      .eq("issue_id", id),
  ]);
  return { ...issue, history: unwrap(history), images: unwrap(images), reports: unwrap(reports) };
});

const changes = {
  title: z.string().trim().min(1),
  description: z.string().trim().min(1),
  root_cause: optionalText,
  risk_description: optionalText,
  severity: z.enum(DB_ISSUE_SEVERITIES),
  status: z.enum(DB_ISSUE_STATUSES),
  location_details: optionalText,
  site_location_id: uuid,
  observed_at: z.string().min(1),
};

const updateIssue = z
  .object({ ...changes, comment: z.string().trim().optional() })
  .partial()
  .strict()
  .refine((value) => Object.keys(value).some((key) => key !== "comment"), {
    message: "Provide at least one field to update",
  });

/** Runs through api_update_issue so the status history records the acting user and comment. */
export const PATCH = route(async (request, { params }: IdParams) => {
  const { id } = await params;
  const actor = await requireActor(request);
  const { comment, ...fields } = await parseBody(request, updateIssue);

  const issue = await getIssueDetails(id);
  await assertProjectAccess(actor, issue.project_id);

  unwrap(
    await db().rpc("api_update_issue", {
      p_issue_id: id,
      p_actor_id: actor.id,
      p_changes: fields,
      p_comment: comment || null,
    }),
  );
  return getIssueDetails(id);
});
