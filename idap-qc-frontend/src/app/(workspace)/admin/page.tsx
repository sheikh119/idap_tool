import { Card, PageHeader } from "@/components/ui";
import { FileType2, FolderCog, Map, ShieldCheck, Users } from "lucide-react";
import Link from "next/link";

const items = [
  { label: "Users and roles", description: "Manage project-scoped role assignments.", href: "/admin/users", icon: Users },
  { label: "Projects and packages", description: "Maintain project scope and package metadata.", href: "/admin/projects", icon: FolderCog },
  { label: "Site locations", description: "Manage recursive buildings, floors, rooms, and works.", href: "/admin/locations", icon: Map },
  { label: "Report templates", description: "Manage active versioned report templates.", href: "/admin/report-templates", icon: FileType2 },
];

export default function AdminPage() {
  return <div className="grid gap-6"><PageHeader title="Administration" description="System-wide master data and access controls." /><div className="rounded-lg bg-amber-50 p-4 text-sm text-amber-900"><ShieldCheck className="mr-2 inline size-4" />These areas are visible only to authorized administrators.</div><div className="grid gap-4 sm:grid-cols-2">{items.map(({ label, description, href, icon: Icon }) => <Link key={href} href={href}><Card className="h-full transition hover:border-teal-500"><Icon className="text-teal-700" /><h2 className="mt-4 font-semibold">{label}</h2><p className="mt-1 text-sm text-slate-500">{description}</p></Card></Link>)}</div></div>;
}
