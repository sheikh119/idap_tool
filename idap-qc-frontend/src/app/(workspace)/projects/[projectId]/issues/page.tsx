import { IssuesView } from "@/features/issues/issues-view";

export default async function IssuesPage({ params }: PageProps<"/projects/[projectId]/issues">) {
  const { projectId } = await params;
  return <IssuesView projectId={projectId} />;
}
