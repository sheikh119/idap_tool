"use client";

import { ArrowDown, ArrowUp, Check, Plus } from "lucide-react";
import { useEffect } from "react";
import { Badge, Button, Card } from "@/components/ui";
import { issues, reports } from "@/mocks/fixtures";
import { useReportBuilderStore } from "./report-builder.store";

export function ReportBuilder({ reportId }: { reportId: string }) {
  const { sections, addSection, toggleIssue, moveIssue, reset } = useReportBuilderStore();
  const report = reports.find((item) => item.id === reportId);
  useEffect(() => {
    if (sections.length === 0) reset(report?.sections ?? []);
  }, [report, reset, sections.length]);

  const assigned = new Set(sections.flatMap((section) => section.issueIds));
  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_22rem]">
      <div className="grid gap-4">
        {sections.map((section) => (
          <Card key={section.id}>
            <div className="flex items-center justify-between"><div><Badge tone={section.type === "CRITICAL" ? "red" : "blue"}>{section.type}</Badge><h2 className="mt-2 font-semibold">{section.heading}</h2></div><span className="text-sm text-slate-500">{section.issueIds.length} observations</span></div>
            <div className="mt-4 grid gap-2">
              {section.issueIds.map((issueId, index) => {
                const issue = issues.find((item) => item.id === issueId);
                if (!issue) return null;
                return <div key={issueId} className="flex items-center gap-3 rounded-lg border border-slate-200 p-3"><span className="grid size-8 shrink-0 place-items-center rounded-full bg-slate-900 text-xs font-bold text-white">{index + 1}</span><div className="min-w-0 flex-1"><p className="truncate text-sm font-semibold">{issue.title}</p><p className="truncate text-xs text-slate-500">{issue.locationName}</p></div><button aria-label="Move up" disabled={index === 0} onClick={() => moveIssue(section.id, issueId, -1)} className="p-1 disabled:opacity-20"><ArrowUp className="size-4" /></button><button aria-label="Move down" disabled={index === section.issueIds.length - 1} onClick={() => moveIssue(section.id, issueId, 1)} className="p-1 disabled:opacity-20"><ArrowDown className="size-4" /></button><button onClick={() => toggleIssue(section.id, issueId)} className="text-xs font-semibold text-red-700">Remove</button></div>;
              })}
              {section.issueIds.length === 0 && <p className="rounded-lg bg-slate-50 p-5 text-center text-sm text-slate-500">Add observations from the eligible issues list.</p>}
            </div>
          </Card>
        ))}
        <div className="flex flex-wrap gap-2"><Button variant="secondary" onClick={() => addSection("CRITICAL")}><Plus className="mr-2 size-4" />Critical section</Button><Button variant="secondary" onClick={() => addSection("GENERAL")}><Plus className="mr-2 size-4" />General section</Button></div>
      </div>
      <aside>
        <Card className="sticky top-24">
          <h2 className="font-semibold">Eligible project issues</h2><p className="mt-1 text-xs text-slate-500">Select a section, then add issues within report scope.</p>
          <div className="mt-4 grid gap-2">{issues.map((issue) => <div key={issue.id} className="rounded-lg border border-slate-200 p-3"><p className="text-sm font-semibold">{issue.title}</p><p className="mt-1 text-xs text-slate-500">{issue.locationName}</p>{assigned.has(issue.id) ? <span className="mt-2 flex items-center text-xs font-semibold text-emerald-700"><Check className="mr-1 size-3" />Added</span> : sections.length > 0 ? <button className="mt-2 text-xs font-semibold text-teal-700" onClick={() => toggleIssue(sections[0].id, issue.id)}>+ Add to first section</button> : null}</div>)}</div>
          <Button className="mt-5 w-full" disabled={sections.length === 0 || assigned.size === 0}>Save and review</Button>
        </Card>
      </aside>
    </div>
  );
}
