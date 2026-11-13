import {
  assertProjectAccess,
  db,
  HttpError,
  type IdParams,
  notFound,
  requireActor,
  route,
  unwrap,
} from "@/lib/api/server";
import {
  BUCKETS,
  MAX_REPORT_BYTES,
  REPORT_FILE_TYPES,
  readForm,
  removeFiles,
  reportFilePath,
  requireFile,
  signedUrls,
  uploadFile,
} from "@/lib/storage";

type ReportFileRef = {
  report_id: string;
  project_id: string;
  project_code: string;
  document_no: string;
  status: string;
  generated_file_path: string | null;
};

async function getReportFileRef(id: string) {
  return (
    unwrap<ReportFileRef | null>(
      await db()
        .from("v_report_summary")
        .select("report_id, project_id, project_code, document_no, status, generated_file_path")
        .eq("report_id", id)
        .maybeSingle(),
    ) ?? notFound("Report")
  );
}

async function describe(path: string) {
  const [view, download] = await Promise.all([
    signedUrls(BUCKETS.reports, [path]),
    signedUrls(BUCKETS.reports, [path], true),
  ]);
  return { path, url: view[path] ?? null, download_url: download[path] ?? null };
}

export const GET = route(async (_request, { params }: IdParams) => {
  const { id } = await params;
  const report = await getReportFileRef(id);
  if (!report.generated_file_path) throw new HttpError(404, "No file generated for this report yet", "NO_FILE");
  return describe(report.generated_file_path);
});

/**
 * multipart/form-data: file (pdf/docx, max 50 MB). Stands in for the document generator:
 * stores the file at reports/<PROJECT_CODE>/<document_no>.<ext>, replacing any previous one.
 */
export const POST = route(async (request, { params }: IdParams) => {
  const { id } = await params;
  const actor = await requireActor(request);
  const report = await getReportFileRef(id);
  await assertProjectAccess(actor, report.project_id);

  const { file, ext } = requireFile(await readForm(request), REPORT_FILE_TYPES, MAX_REPORT_BYTES);
  const path = reportFilePath(report.project_code, report.document_no, ext);
  await uploadFile(BUCKETS.reports, path, file, file.type, true);

  unwrap(await db().from("reports").update({ generated_file_path: path }).eq("id", id).select("id").single());
  if (report.generated_file_path && report.generated_file_path !== path) {
    await removeFiles(BUCKETS.reports, [report.generated_file_path]);
  }
  return describe(path);
}, 201);

export const DELETE = route(async (request, { params }: IdParams) => {
  const { id } = await params;
  const actor = await requireActor(request);
  const report = await getReportFileRef(id);
  await assertProjectAccess(actor, report.project_id);
  if (!report.generated_file_path) throw new HttpError(404, "No file generated for this report yet", "NO_FILE");

  unwrap(await db().from("reports").update({ generated_file_path: null }).eq("id", id).select("id").single());
  await removeFiles(BUCKETS.reports, [report.generated_file_path]);
  return { path: report.generated_file_path, removed: true };
});
