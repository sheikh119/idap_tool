import { Suspense } from "react";
import { ReportDetail } from "./report-detail";

export default function ReportDetailPage({ params }: PageProps<"/test/reports/[id]">) {
  return (
    <Suspense fallback={<p className="text-sm text-slate-500">Loading report…</p>}>
      {params.then(({ id }) => (
        <ReportDetail id={id} />
      ))}
    </Suspense>
  );
}
