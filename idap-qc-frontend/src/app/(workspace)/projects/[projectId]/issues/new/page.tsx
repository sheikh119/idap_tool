import { PageHeader } from "@/components/ui";
import { IssueForm } from "@/features/issues/issue-form";

export default async function NewIssuePage({ params }: PageProps<"/projects/[projectId]/issues/new">) {
  const { projectId } = await params;
  return (
    <div className="mx-auto grid max-w-3xl gap-6">
      <PageHeader title="New site issue" description="Record the observation while you are on site." />
      <IssueForm projectId={projectId} />
    </div>
  );
}
