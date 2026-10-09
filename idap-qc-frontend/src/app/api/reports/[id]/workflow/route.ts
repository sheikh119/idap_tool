import { z } from "zod";
import { db, type IdParams, parseBody, requireActor, route, unwrap } from "@/lib/api/server";
import { REPORT_WORKFLOW_ACTIONS } from "@/lib/db/enums";

const transition = z
  .object({
    action: z.enum(REPORT_WORKFLOW_ACTIONS),
    comment: z.string().trim().optional(),
  })
  .strict();

/**
 * submit: DRAFT/REJECTED/REOPENED -> SUBMITTED    review: SUBMITTED -> UNDER_REVIEW
 * approve (GM only): UNDER_REVIEW -> APPROVED     reject (comment required): SUBMITTED/UNDER_REVIEW -> REJECTED
 * reopen (GM only, comment required): APPROVED -> REOPENED
 * Role, project-access and state rules are enforced by the database procedures.
 */
export const POST = route(async (request, { params }: IdParams) => {
  const { id } = await params;
  const actor = await requireActor(request);
  const { action, comment } = await parseBody(request, transition);

  unwrap(
    await db().rpc("api_report_workflow", {
      p_report_id: id,
      p_actor_id: actor.id,
      p_action: action,
      p_comment: comment || null,
    }),
  );
  return unwrap(await db().from("v_report_summary").select("*").eq("report_id", id).single());
});
