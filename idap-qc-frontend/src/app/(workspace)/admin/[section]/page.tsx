import { Button, Card, PageHeader } from "@/components/ui";
import { Plus } from "lucide-react";
import { notFound } from "next/navigation";

const sections = {
  users: ["Users and project roles", "Role assignments will be loaded from the backend user-role service."],
  projects: ["Projects and packages", "Project and package master data is archived rather than hard-deleted."],
  locations: ["Site locations", "Locations support recursive project, building, floor, room, road, and utility levels."],
  "report-templates": ["Report templates", "Template versions remain stable for approved historical reports."],
} as const;

export default async function AdminSectionPage({ params }: PageProps<"/admin/[section]">) {
  const { section } = await params;
  const content = sections[section as keyof typeof sections];
  if (!content) notFound();
  return <div className="grid gap-6"><PageHeader title={content[0]} description={content[1]} actions={<Button><Plus className="mr-2 size-4" />Add record</Button>} /><Card><p className="py-12 text-center text-sm text-slate-500">Connect the backend endpoint to display and manage records here.</p></Card></div>;
}
