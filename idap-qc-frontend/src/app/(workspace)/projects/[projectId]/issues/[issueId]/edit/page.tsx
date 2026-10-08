import { PageHeader } from "@/components/ui";
import { IssueForm } from "@/features/issues/issue-form";
import { issues } from "@/mocks/fixtures";
import { notFound } from "next/navigation";

export default async function EditIssuePage({ params }: PageProps<"/projects/[projectId]/issues/[issueId]/edit">) {
  const { projectId, issueId } = await params;
  const issue = issues.find((item) => item.id === issueId && item.projectId === projectId);
  if (!issue) notFound();
  return <div className="mx-auto grid max-w-3xl gap-6"><PageHeader title="Edit site issue" description="Only open issues and issues in editable reports can be changed." /><IssueForm projectId={projectId} initialIssue={issue} /></div>;
}
