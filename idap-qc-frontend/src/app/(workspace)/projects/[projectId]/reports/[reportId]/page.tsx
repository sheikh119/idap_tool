import { Badge, Button, Card, PageHeader } from "@/components/ui";
import { WorkflowActions } from "@/features/reports/workflow-actions";
import { issues, reports } from "@/mocks/fixtures";
import { Download, Pencil } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";

export default async function ReportDetailPage({ params }: PageProps<"/projects/[projectId]/reports/[reportId]">) {
  const { projectId, reportId } = await params;
  const report = reports.find((item) => item.id === reportId && item.projectId === projectId);
  if (!report) notFound();
  return (
    <div className="grid gap-6">
      <PageHeader title={report.title} description={`${report.documentNo} · Site visit ${report.siteVisitDate}`} actions={report.status === "DRAFT" ? <Link href={`/projects/${projectId}/reports/${reportId}/build`}><Button variant="secondary"><Pencil className="mr-2 size-4" />Edit report</Button></Link> : undefined} />
      <div><Badge tone={report.status === "APPROVED" ? "green" : "slate"}>{report.status.replace("_", " ")}</Badge></div>
      <Card><div className="grid gap-2 text-sm sm:grid-cols-3"><p><span className="block text-slate-500">Template</span>{report.templateName}</p><p><span className="block text-slate-500">Created by</span>{report.createdBy}</p><p><span className="block text-slate-500">Observations</span>{report.sections.reduce((sum, section) => sum + section.issueIds.length, 0)}</p></div></Card>
      <section className="grid gap-4">{report.sections.map((section) => <Card key={section.id}><h2 className="font-bold uppercase tracking-wide">{section.heading}</h2><div className="mt-4 grid gap-4">{section.issueIds.map((id, index) => { const issue = issues.find((item) => item.id === id); return issue ? <article key={id} className="border-t border-slate-100 pt-4"><p className="text-xs font-bold text-teal-700">OBSERVATION {index + 1}</p><h3 className="mt-1 font-semibold">{issue.title}</h3><p className="mt-2 text-sm leading-6 text-slate-600">{issue.description}</p></article> : null; })}</div></Card>)}</section>
      <Card><h2 className="mb-4 font-semibold">Workflow actions</h2><WorkflowActions reportId={report.id} status={report.status} />{report.generatedFileUrl && <Button className="mt-4" variant="secondary"><Download className="mr-2 size-4" />Download approved report</Button>}</Card>
    </div>
  );
}
