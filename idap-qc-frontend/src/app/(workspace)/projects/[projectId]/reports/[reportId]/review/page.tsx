import { redirect } from "next/navigation";

export default async function ReportReviewPage({ params }: PageProps<"/projects/[projectId]/reports/[reportId]/review">) {
  const { projectId, reportId } = await params;
  redirect(`/projects/${projectId}/reports/${reportId}`);
}
