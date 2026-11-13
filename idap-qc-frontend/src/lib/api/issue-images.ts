import "server-only";
import { db, notFound, unwrap } from "@/lib/api/server";
import { BUCKETS, signedUrls } from "@/lib/storage";

export type IssueRef = { issue_id: string; project_id: string; project_code: string };

export type ImageRow = { id: string; storage_path: string; annotated_storage_path: string | null };

export async function getIssueRef(id: string): Promise<IssueRef> {
  return (
    unwrap<IssueRef | null>(
      await db().from("v_issue_details").select("issue_id, project_id, project_code").eq("issue_id", id).maybeSingle(),
    ) ?? notFound("Issue")
  );
}

export async function getImage(issueId: string, imageId: string): Promise<ImageRow> {
  return (
    unwrap<ImageRow | null>(
      await db().from("issue_images").select("*").eq("id", imageId).eq("issue_id", issueId).maybeSingle(),
    ) ?? notFound("Image")
  );
}

/** Adds short-lived signed `url` / `annotated_url` to image rows. */
export async function withUrls<T extends ImageRow>(rows: T[]) {
  const urls = await signedUrls(
    BUCKETS.issueImages,
    rows.flatMap((row) => [row.storage_path, row.annotated_storage_path ?? ""]),
  );
  return rows.map((row) => ({
    ...row,
    url: urls[row.storage_path] ?? null,
    annotated_url: row.annotated_storage_path ? (urls[row.annotated_storage_path] ?? null) : null,
  }));
}
