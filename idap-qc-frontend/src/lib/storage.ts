import "server-only";
import { HttpError } from "@/lib/api/server";
import { getSupabase } from "@/lib/supabase/server";

// Mirrors src/db/qc_storage.sql. Paths are stored in the DB; URLs are always signed on read.

export const BUCKETS = {
  issueImages: "issue-images",
  reports: "reports",
} as const;

type Bucket = (typeof BUCKETS)[keyof typeof BUCKETS];

export const IMAGE_TYPES: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
};
export const MAX_IMAGE_BYTES = 10 * 1024 * 1024;

export const REPORT_FILE_TYPES: Record<string, string> = {
  "application/pdf": "pdf",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document": "docx",
};
export const MAX_REPORT_BYTES = 50 * 1024 * 1024;

export const SIGNED_URL_SECONDS = 60 * 60;

export function issueImagePath(projectCode: string, issueId: string, imageId: string, ext: string) {
  return `${projectCode}/${issueId}/${imageId}.${ext}`;
}

export function reportFilePath(projectCode: string, documentNo: string, ext: string) {
  return `${projectCode}/${documentNo}.${ext}`;
}

/** Storage RLS blocks the publishable key, so file operations need the secret key. */
function storage(bucket: Bucket) {
  if (!process.env.SUPABASE_SECRET_KEY) {
    throw new HttpError(503, "File storage needs SUPABASE_SECRET_KEY in .env.local", "STORAGE_NOT_CONFIGURED");
  }
  return getSupabase().storage.from(bucket);
}

function storageError(error: { message: string }, action: string): never {
  const status = /not found/i.test(error.message) ? 404 : /exceeded|too large|mime|type/i.test(error.message) ? 400 : 502;
  throw new HttpError(status, `Storage ${action} failed: ${error.message}`, "STORAGE_ERROR");
}

export async function uploadFile(bucket: Bucket, path: string, file: Blob, contentType: string, upsert = false) {
  const { error } = await storage(bucket).upload(path, file, { contentType, upsert });
  if (error) storageError(error, "upload");
}

export async function removeFiles(bucket: Bucket, paths: string[]) {
  const list = paths.filter(Boolean);
  if (!list.length) return;
  const { error } = await storage(bucket).remove(list);
  if (error) storageError(error, "delete");
}

/** Returns path -> signed URL; paths whose object is missing map to null. */
export async function signedUrls(bucket: Bucket, paths: string[], download = false) {
  const list = [...new Set(paths.filter(Boolean))];
  const urls: Record<string, string | null> = {};
  if (!list.length) return urls;

  if (download) {
    for (const path of list) {
      const { data } = await storage(bucket).createSignedUrl(path, SIGNED_URL_SECONDS, { download: true });
      urls[path] = data?.signedUrl ?? null;
    }
    return urls;
  }

  const { data, error } = await storage(bucket).createSignedUrls(list, SIGNED_URL_SECONDS);
  if (error) storageError(error, "signing");
  for (const item of data ?? []) if (item.path) urls[item.path] = item.error ? null : item.signedUrl;
  return urls;
}

/** Reads a multipart field as a File and validates its type and size. */
export function requireFile(form: FormData, types: Record<string, string>, maxBytes: number) {
  const file = form.get("file");
  if (!(file instanceof File) || file.size === 0) {
    throw new HttpError(400, "Attach a file in the 'file' form field", "NO_FILE");
  }
  const ext = types[file.type];
  if (!ext) {
    throw new HttpError(400, `Unsupported file type ${file.type || "(unknown)"}; allowed: ${Object.keys(types).join(", ")}`, "BAD_FILE_TYPE");
  }
  if (file.size > maxBytes) {
    throw new HttpError(400, `File is ${(file.size / 1048576).toFixed(1)} MB; limit is ${maxBytes / 1048576} MB`, "FILE_TOO_LARGE");
  }
  return { file, ext };
}

export async function readForm(request: Request) {
  try {
    return await request.formData();
  } catch {
    throw new HttpError(400, "Send the upload as multipart/form-data", "INVALID_FORM");
  }
}
