"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useQuery } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { Button, Card, Field, Input, Select } from "@/components/ui";
import { routes } from "@/constants/routes";
import { projectApi, reportApi } from "@/services/api";

const schema = z.object({
  packageId: z.string().optional(),
  documentNo: z.string().trim().min(3, "Enter a document number."),
  title: z.string().trim().min(3, "Enter a report title."),
  siteVisitDate: z.string().min(1, "Select the site visit date."),
  templateName: z.string().min(1, "Select a report template."),
});
type Values = z.infer<typeof schema>;

export function ReportForm({ projectId }: { projectId: string }) {
  const router = useRouter();
  const { data: projectList = [] } = useQuery({ queryKey: ["projects"], queryFn: projectApi.list });
  const packagesQuery = useQuery({
    queryKey: ["packages", projectId],
    queryFn: () => projectApi.packages(projectId),
  });
  const project = projectList.find((item) => item.id === projectId);
  const packageList = packagesQuery.data ?? [];

  const { register, handleSubmit, setError, formState: { errors, isSubmitting } } = useForm<Values>({
    resolver: zodResolver(schema),
    defaultValues: { siteVisitDate: new Date().toISOString().slice(0, 10), templateName: "IDAP Standard QC Report v1" },
  });

  async function submit({ packageId, ...values }: Values) {
    try {
      const report = await reportApi.create({ ...values, projectId, packageId: packageId || undefined });
      router.push(routes.buildReport(projectId, report.id));
    } catch {
      setError("root", { message: "The report could not be created. Check your connection and try again." });
    }
  }

  return (
    <form className="grid gap-5" onSubmit={handleSubmit(submit)}>
      <Card className="grid gap-4">
        <Field label="Project">
          <Input value={project ? `${project.code} — ${project.name}` : "Loading project…"} disabled />
        </Field>
        <Field label="Package (optional)">
          {packagesQuery.isPending ? (
            <Select disabled>
              <option>Loading packages…</option>
            </Select>
          ) : (
            <Select {...register("packageId")} disabled={packageList.length === 0}>
              <option value="">{packageList.length === 0 ? "No packages in this project" : "Whole project"}</option>
              {packageList.map((pkg) => (
                <option key={pkg.id} value={pkg.id}>
                  {pkg.code} — {pkg.name}
                </option>
              ))}
            </Select>
          )}
        </Field>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Document number" error={errors.documentNo?.message}>
            <Input {...register("documentNo")} placeholder="QC-NZE-2026-015" />
          </Field>
          <Field label="Site visit date" error={errors.siteVisitDate?.message}>
            <Input type="date" {...register("siteVisitDate")} />
          </Field>
        </div>
        <Field label="Report title" error={errors.title?.message}>
          <Input {...register("title")} placeholder="Weekly Site Quality Inspection" />
        </Field>
        <Field label="Report template" error={errors.templateName?.message}>
          <Select {...register("templateName")}>
            <option value="IDAP Standard QC Report v1">IDAP Standard QC Report v1</option>
          </Select>
        </Field>
      </Card>
      {errors.root?.message && (
        <p role="alert" className="rounded-lg bg-red-50 p-3 text-sm text-red-800">
          {errors.root.message}
        </p>
      )}
      <div className="flex justify-end gap-3">
        <Button type="button" variant="secondary" onClick={() => router.back()}>
          Cancel
        </Button>
        <Button disabled={isSubmitting}>{isSubmitting ? "Creating…" : "Create and add observations"}</Button>
      </div>
    </form>
  );
}
