import { z } from "zod";
import { db, parseBody, route, unwrap } from "@/lib/api/server";
import { ROLE_NAMES } from "@/lib/db/enums";

export const GET = route(async () => {
  const rows = unwrap<{ key: string; value: unknown; updated_at: string }[]>(
    await db().from("app_settings").select("*").order("key"),
  );
  return rows;
});

const setting = z.discriminatedUnion("key", [
  z.object({ key: z.literal("require_issue_images_on_submit"), value: z.boolean() }),
  z.object({ key: z.literal("allowed_review_start_roles"), value: z.array(z.enum(ROLE_NAMES)) }),
  z.object({ key: z.literal("allowed_reject_roles"), value: z.array(z.enum(ROLE_NAMES)) }),
]);

export const PATCH = route(async (request) => {
  const body = await parseBody(request, setting);
  return unwrap(
    await db()
      .from("app_settings")
      .upsert({ ...body, updated_at: new Date().toISOString() }, { onConflict: "key" })
      .select()
      .single(),
  );
});
