import { z } from "zod";
import { getImage, getIssueRef, type ImageRow, withUrls } from "@/lib/api/issue-images";
import {
  assertProjectAccess,
  db,
  HttpError,
  optionalText,
  type Params,
  parseBody,
  patchSchema,
  requireActor,
  route,
  unwrap,
} from "@/lib/api/server";
import { BUCKETS, removeFiles } from "@/lib/storage";

type ImageParams = Params<{ id: string; imageId: string }>;

const updateImage = patchSchema({
  caption: optionalText,
  display_order: z.number().int().positive(),
});

export const PATCH = route(async (request, { params }: ImageParams) => {
  const { id, imageId } = await params;
  const actor = await requireActor(request);
  const body = await parseBody(request, updateImage);
  await assertProjectAccess(actor, (await getIssueRef(id)).project_id);
  await getImage(id, imageId);

  const row = unwrap<ImageRow>(await db().from("issue_images").update(body).eq("id", imageId).select().single());
  const [withUrl] = await withUrls([row]);
  return withUrl;
});

/** Images are evidence: they cannot be deleted once the issue is in an APPROVED report. */
export const DELETE = route(async (request, { params }: ImageParams) => {
  const { id, imageId } = await params;
  const actor = await requireActor(request);
  await assertProjectAccess(actor, (await getIssueRef(id)).project_id);
  const image = await getImage(id, imageId);

  const approved = await db()
    .from("report_issues")
    .select("issue_id, reports!inner(status)", { count: "exact", head: true })
    .eq("issue_id", id)
    .eq("reports.status", "APPROVED");
  unwrap(approved);
  if (approved.count) {
    throw new HttpError(422, "Issue appears in an APPROVED report; its images are frozen", "IMAGES_FROZEN");
  }

  unwrap(await db().from("issue_images").delete().eq("id", imageId));
  await removeFiles(BUCKETS.issueImages, [image.storage_path, image.annotated_storage_path ?? ""]);
  return image;
});
