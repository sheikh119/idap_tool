"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Camera, ImagePlus, Save } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { Button, Card, Field, Input, Select, Textarea } from "@/components/ui";
import { useQuery } from "@tanstack/react-query";
import { routes } from "@/constants/routes";
import { genericIssues } from "@/mocks/fixtures";
import { issueApi, projectApi } from "@/services/api";
import type { Issue } from "@/types/domain";

const schema = z.object({
  locationId: z.string().min(1, "Select a site location."),
  genericIssueId: z.string().optional(),
  title: z.string().trim().min(3, "Enter an issue title.").max(160),
  description: z.string().trim().min(10, "Enter a useful description."),
  rootCause: z.string().optional(),
  riskDescription: z.string().optional(),
  severity: z.enum(["LOW", "MEDIUM", "HIGH", "CRITICAL"]),
  observedAt: z.string().min(1, "Select the observation date."),
});

type Values = z.infer<typeof schema>;

export function IssueForm({ projectId, initialIssue }: { projectId: string; initialIssue?: Issue }) {
  const router = useRouter();
  const locationsQuery = useQuery({
    queryKey: ["locations", projectId],
    queryFn: () => projectApi.locations(projectId),
  });
  const locations = locationsQuery.data ?? [];
  const [files, setFiles] = useState<File[]>([]);
  const [submitError, setSubmitError] = useState("");
  const { register, setValue, handleSubmit, formState: { errors, isSubmitting } } = useForm<Values>({
    resolver: zodResolver(schema),
    defaultValues: initialIssue
      ? {
          locationId: initialIssue.locationId,
          title: initialIssue.title,
          description: initialIssue.description,
          rootCause: initialIssue.rootCause,
          riskDescription: initialIssue.riskDescription,
          severity: initialIssue.severity,
          observedAt: initialIssue.observedAt,
        }
      : { severity: "MEDIUM", observedAt: new Date().toISOString().slice(0, 10) },
  });

  function selectTemplate(id: string) {
    setValue("genericIssueId", id);
    const item = genericIssues.find((candidate) => candidate.id === id);
    if (!item) return;
    setValue("title", item.title, { shouldValidate: true });
    setValue("description", item.defaultDescription, { shouldValidate: true });
    setValue("rootCause", item.defaultRootCause);
    setValue("riskDescription", item.defaultRisk);
    if (item.defaultSeverity) setValue("severity", item.defaultSeverity);
  }

  async function submit(values: Values) {
    setSubmitError("");
    try {
      const location = locations.find((item) => item.id === values.locationId);
      const input = {
        ...values,
        projectId,
        locationName: location?.name ?? "",
        status: initialIssue?.status ?? "OPEN",
      } as const;
      if (initialIssue) await issueApi.update(initialIssue.id, input);
      else await issueApi.create(input);
      router.push(initialIssue ? routes.issue(projectId, initialIssue.id) : routes.issues(projectId));
    } catch {
      setSubmitError("The issue could not be saved. Check your connection and try again.");
    }
  }

  return (
    <form onSubmit={handleSubmit(submit)} className="grid gap-5">
      <Card className="grid gap-4">
        <h2 className="font-semibold text-slate-950">Location and issue</h2>
        <Field
          label="Site location"
          error={
            errors.locationId?.message ??
            (locationsQuery.isError
              ? "Site locations could not be loaded. Reload the page to try again."
              : locationsQuery.isSuccess && locations.length === 0
                ? "This project has no site locations yet. Ask an administrator to add them."
                : undefined)
          }
        >
          {locationsQuery.isPending ? (
            <Select disabled>
              <option>Loading locations…</option>
            </Select>
          ) : (
            <Select {...register("locationId")}>
              <option value="">Select location</option>
              {locations.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.parentId ? "↳ " : ""}
                  {item.name}
                </option>
              ))}
            </Select>
          )}
        </Field>
        <Field label="Use predefined issue (optional)"><Select onChange={(event) => selectTemplate(event.target.value)} defaultValue=""><option value="">Start from blank issue</option>{genericIssues.map((item) => <option key={item.id} value={item.id}>{item.code} — {item.title}</option>)}</Select></Field>
        <Field label="Issue title" error={errors.title?.message}><Input {...register("title")} placeholder="What did you observe?" /></Field>
        <Field label="Description / required rectification" error={errors.description?.message}><Textarea {...register("description")} rows={4} placeholder="Describe the condition and required action." /></Field>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Root cause"><Textarea {...register("rootCause")} /></Field>
          <Field label="Risk description"><Textarea {...register("riskDescription")} /></Field>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Severity" error={errors.severity?.message}><Select {...register("severity")}><option value="LOW">Low</option><option value="MEDIUM">Medium</option><option value="HIGH">High</option><option value="CRITICAL">Critical</option></Select></Field>
          <Field label="Observed date" error={errors.observedAt?.message}><Input type="date" {...register("observedAt")} /></Field>
        </div>
      </Card>

      <Card>
        <h2 className="font-semibold text-slate-950">Photographs</h2>
        <p className="mt-1 text-sm text-slate-500">Add one or more site photos. Submission policy may require at least one.</p>
        <label className="mt-4 flex min-h-32 cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed border-slate-300 bg-slate-50 p-5 text-center hover:border-teal-600">
          <ImagePlus className="mb-2 text-teal-700" />
          <span className="text-sm font-semibold">Take photos or choose images</span>
          <span className="mt-1 text-xs text-slate-500">JPEG, PNG or WebP</span>
          <input className="sr-only" type="file" accept="image/*" capture="environment" multiple onChange={(event) => setFiles(Array.from(event.target.files ?? []))} />
        </label>
        {files.length > 0 && <div className="mt-3 rounded-lg bg-teal-50 p-3 text-sm text-teal-900"><Camera className="mr-2 inline size-4" />{files.length} photo{files.length === 1 ? "" : "s"} ready to upload</div>}
      </Card>
      {submitError && <p role="alert" className="rounded-lg bg-red-50 p-3 text-sm text-red-800">{submitError}</p>}
      <div className="flex justify-end gap-3"><Button type="button" variant="secondary" onClick={() => router.back()}>Cancel</Button><Button disabled={isSubmitting}><Save className="mr-2 size-4" />{isSubmitting ? "Saving…" : initialIssue ? "Update issue" : "Save issue"}</Button></div>
    </form>
  );
}
