import { ReportsView } from "@/features/reports/reports-view";

export default async function ReportsPage({ params }: PageProps<"/projects/[projectId]/reports">) {
  const { projectId } = await params;
  return <ReportsView projectId={projectId} />;
}
