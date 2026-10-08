import { redirect } from "next/navigation";

export default async function ReportPreviewPage({ params }: PageProps<"/projects/[projectId]/reports/[reportId]/preview">) {
  const { projectId, reportId } = await params;
  redirect(`/projects/${projectId}/reports/${reportId}`);
}
