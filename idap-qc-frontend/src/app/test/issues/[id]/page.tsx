import { Suspense } from "react";
import { IssueDetail } from "./issue-detail";

export default function IssueDetailPage({ params }: PageProps<"/test/issues/[id]">) {
  return (
    <Suspense fallback={<p className="text-sm text-slate-500">Loading issue…</p>}>
      {params.then(({ id }) => (
        <IssueDetail id={id} />
      ))}
    </Suspense>
  );
}
