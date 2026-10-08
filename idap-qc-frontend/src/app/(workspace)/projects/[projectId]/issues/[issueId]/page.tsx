import { Badge, Button, Card, PageHeader } from "@/components/ui";
import { issues } from "@/mocks/fixtures";
import { Calendar, MapPin, Pencil, User } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";

export default async function IssueDetailPage({ params }: PageProps<"/projects/[projectId]/issues/[issueId]">) {
  const { projectId, issueId } = await params;
  const issue = issues.find((item) => item.id === issueId && item.projectId === projectId);
  if (!issue) notFound();
  return (
    <div className="grid gap-6">
      <PageHeader title={issue.title} description={`Issue ${issue.id.toUpperCase()}`} actions={<Link href={`/projects/${projectId}/issues/${issue.id}/edit`}><Button variant="secondary"><Pencil className="mr-2 size-4" />Edit issue</Button></Link>} />
      <div className="flex flex-wrap gap-2"><Badge tone={issue.severity === "CRITICAL" ? "red" : "amber"}>{issue.severity}</Badge><Badge tone="blue">{issue.status.replace("_", " ")}</Badge></div>
      <div className="grid gap-5 lg:grid-cols-[1fr_20rem]">
        <Card className="grid gap-5"><section><h2 className="text-sm font-semibold text-slate-500">Description / rectification</h2><p className="mt-2 leading-7">{issue.description}</p></section>{issue.rootCause && <section><h2 className="text-sm font-semibold text-slate-500">Root cause</h2><p className="mt-2">{issue.rootCause}</p></section>}{issue.riskDescription && <section><h2 className="text-sm font-semibold text-slate-500">Risk</h2><p className="mt-2">{issue.riskDescription}</p></section>}</Card>
        <Card className="h-fit grid gap-4 text-sm"><p className="flex gap-3"><MapPin className="size-4 text-teal-700" />{issue.locationName}</p><p className="flex gap-3"><Calendar className="size-4 text-teal-700" />{issue.observedAt}</p><p className="flex gap-3"><User className="size-4 text-teal-700" />{issue.reporter}</p></Card>
      </div>
      <Card><h2 className="font-semibold">Photographs</h2><p className="mt-4 rounded-lg bg-slate-50 p-8 text-center text-sm text-slate-500">No photographs in the mock record.</p></Card>
    </div>
  );
}
