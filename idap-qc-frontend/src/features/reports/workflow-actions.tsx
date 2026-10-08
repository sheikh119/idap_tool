"use client";

import { useState } from "react";
import { Button, Field, Textarea } from "@/components/ui";
import { reportApi } from "@/services/api";
import type { ReportStatus } from "@/types/domain";

export function WorkflowActions({ reportId, status }: { reportId: string; status: ReportStatus }) {
  const [comment, setComment] = useState("");
  const [message, setMessage] = useState("");
  const act = async (action: "submit" | "review" | "approve" | "reject") => {
    if (action === "reject" && !comment.trim()) return setMessage("A rejection comment is required.");
    await reportApi.transition(reportId, action, comment);
    setMessage(`${action[0].toUpperCase()}${action.slice(1)} action completed in mock mode.`);
  };
  return (
    <div className="grid gap-3">
      {(status === "SUBMITTED" || status === "UNDER_REVIEW") && <Field label="Review comment"><Textarea value={comment} onChange={(event) => setComment(event.target.value)} placeholder="Add review notes…" /></Field>}
      <div className="flex flex-wrap gap-2">
        {(status === "DRAFT" || status === "REJECTED") && <Button onClick={() => act("submit")}>Submit report</Button>}
        {status === "SUBMITTED" && <Button onClick={() => act("review")}>Start review</Button>}
        {status === "UNDER_REVIEW" && <><Button onClick={() => act("approve")}>Approve</Button><Button variant="danger" onClick={() => act("reject")}>Reject</Button></>}
      </div>
      {message && <p role="status" className="text-sm text-slate-600">{message}</p>}
    </div>
  );
}
