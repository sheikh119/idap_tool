import { Badge, Button, Card, Input, PageHeader } from "@/components/ui";
import { genericIssues } from "@/mocks/fixtures";
import { Plus, Search } from "lucide-react";

export default function CataloguePage() {
  return <div className="grid gap-6"><PageHeader title="Generic issue catalogue" description="Reusable QC wording copied into new site issues." actions={<Button><Plus className="mr-2 size-4" />Add catalogue issue</Button>} /><Card><label className="relative block"><Search className="absolute left-3 top-3.5 size-4 text-slate-400" /><Input className="pl-9" placeholder="Search code, category, or title…" /></label></Card><div className="grid gap-3">{genericIssues.map((item) => <Card key={item.id}><div className="flex flex-wrap items-center gap-2"><Badge tone="blue">{item.code}</Badge><Badge>{item.category}</Badge></div><h2 className="mt-3 font-semibold">{item.title}</h2><p className="mt-2 text-sm leading-6 text-slate-600">{item.defaultDescription}</p></Card>)}</div></div>;
}
