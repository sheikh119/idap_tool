import { PageHeader } from "@/components/ui";
import { ReportForm } from "@/features/reports/report-form";

export default async function NewReportPage({ params }: PageProps<"/projects/[projectId]/reports/new">) {
  const { projectId } = await params;
  return (
    <div className="mx-auto grid max-w-3xl gap-6">
      <PageHeader title="Create inspection report" description="Set the report scope and template before adding observations." />
      <ReportForm projectId={projectId} />
    </div>
  );
}
