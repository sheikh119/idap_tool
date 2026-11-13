import { getIssueRef, type ImageRow, withUrls } from "@/lib/api/issue-images";
import { assertProjectAccess, db, type IdParams, requireActor, route, unwrap } from "@/lib/api/server";
import {
  BUCKETS,
  IMAGE_TYPES,
  MAX_IMAGE_BYTES,
  issueImagePath,
  readForm,
  removeFiles,
  requireFile,
  uploadFile,
} from "@/lib/storage";

export const GET = route(async (_request, { params }: IdParams) => {
  const { id } = await params;
  await getIssueRef(id);
  const rows = unwrap<ImageRow[]>(await db().from("issue_images").select("*").eq("issue_id", id).order("display_order"));
  return withUrls(rows);
});

/** multipart/form-data: file (jpeg/png/webp, max 10 MB), caption (optional). */
export const POST = route(async (request, { params }: IdParams) => {
  const { id } = await params;
  const actor = await requireActor(request);
  const issue = await getIssueRef(id);
  await assertProjectAccess(actor, issue.project_id);

  const form = await readForm(request);
  const { file, ext } = requireFile(form, IMAGE_TYPES, MAX_IMAGE_BYTES);
  const caption = String(form.get("caption") ?? "").trim() || null;

  const imageId = crypto.randomUUID();
  const path = issueImagePath(issue.project_code, id, imageId, ext);
  await uploadFile(BUCKETS.issueImages, path, file, file.type);

  const inserted = await db()
    .from("issue_images")
    .insert({
      id: imageId,
      issue_id: id,
      uploaded_by: actor.id,
      storage_path: path,
      original_filename: file.name || `upload.${ext}`,
      mime_type: file.type,
      file_size: file.size,
      caption,
    })
    .select()
    .single();

  if (inserted.error) await removeFiles(BUCKETS.issueImages, [path]);
  const [row] = await withUrls([unwrap<ImageRow>(inserted)]);
  return row;
}, 201);
