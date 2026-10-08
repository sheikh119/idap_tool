import { PageHeader } from "@/components/ui";
import { ReportBuilder } from "@/features/reports/report-builder";

export default async function BuildReportPage({ params }: PageProps<"/projects/[projectId]/reports/[reportId]/build">) {
  const { reportId } = await params;
  return <div className="grid gap-6"><PageHeader title="Build inspection report" description="Group observations by section and control their report order." /><ReportBuilder reportId={reportId} /></div>;
}
