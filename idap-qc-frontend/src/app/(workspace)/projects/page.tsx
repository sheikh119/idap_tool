import { Badge, Card, PageHeader } from "@/components/ui";
import { projects } from "@/mocks/fixtures";
import { ArrowRight } from "lucide-react";
import Link from "next/link";

export default function ProjectsPage() {
  return <div className="grid gap-6"><PageHeader title="Projects" description="Projects assigned to your QC role." /><div className="grid gap-4 md:grid-cols-2">{projects.map((project) => <Link key={project.id} href={`/projects/${project.id}/issues`}><Card className="transition hover:border-teal-500"><div className="flex items-start justify-between"><span><span className="text-xs font-semibold text-teal-700">{project.code}</span><h2 className="mt-1 font-semibold">{project.name}</h2></span><Badge tone="green">{project.status}</Badge></div><div className="mt-6 flex items-center justify-between text-sm text-slate-500"><span>{project.openIssues} open issues</span><ArrowRight className="size-4" /></div></Card></Link>)}</div></div>;
}
