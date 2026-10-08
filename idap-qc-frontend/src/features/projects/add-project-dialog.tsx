"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus, X } from "lucide-react";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { Button, Field, Input, Select, Textarea } from "@/components/ui";
import { projectApi } from "@/services/api";
import type { CreateProjectInput, Project } from "@/types/domain";

const projectSchema = z
  .object({
    code: z
      .string()
      .trim()
      .min(2, "Enter a project code.")
      .max(30, "Use 30 characters or fewer.")
      .regex(/^[A-Za-z0-9-]+$/, "Use letters, numbers, and hyphens only."),
    name: z.string().trim().min(3, "Enter the project name.").max(160),
    description: z.string().trim().max(1000).optional(),
    status: z.enum(["PLANNING", "ACTIVE", "ON_HOLD"]),
    startDate: z.string().optional(),
    endDate: z.string().optional(),
  })
  .refine(
    (value) =>
      !value.startDate ||
      !value.endDate ||
      new Date(value.endDate) >= new Date(value.startDate),
    {
      message: "End date cannot be earlier than the start date.",
      path: ["endDate"],
    },
  );

type ProjectFormValues = z.infer<typeof projectSchema>;

export function AddProjectDialog({
  onCreated,
  triggerVariant = "primary",
}: {
  onCreated?: (project: Project) => void;
  triggerVariant?: "primary" | "secondary";
}) {
  const [open, setOpen] = useState(false);
  const queryClient = useQueryClient();
  const {
    register,
    handleSubmit,
    reset,
    setError,
    formState: { errors },
  } = useForm<ProjectFormValues>({
    resolver: zodResolver(projectSchema),
    defaultValues: { status: "PLANNING" },
  });

  const createProject = useMutation({
    mutationFn: (values: CreateProjectInput) => projectApi.create(values),
    onSuccess: (project) => {
      queryClient.setQueryData<Project[]>(["projects"], (current = []) => [
        ...current,
        project,
      ]);
      onCreated?.(project);
      reset({ status: "PLANNING" });
      setOpen(false);
    },
    onError: () => {
      setError("root", {
        message: "The project could not be created. Please try again.",
      });
    },
  });

  useEffect(() => {
    if (!open) return;
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, [open]);

  function close() {
    if (createProject.isPending) return;
    setOpen(false);
    reset({ status: "PLANNING" });
  }

  return (
    <>
      <Button variant={triggerVariant} onClick={() => setOpen(true)}>
        <Plus className="mr-2 size-4" />
        Add project
      </Button>

      {open && (
        <div className="fixed inset-0 z-50 grid place-items-center overflow-y-auto p-4">
          <button
            type="button"
            aria-label="Close add project dialog"
            className="absolute inset-0 bg-slate-950/60"
            onClick={close}
          />
          <section
            role="dialog"
            aria-modal="true"
            aria-labelledby="add-project-title"
            className="relative z-10 my-6 w-full max-w-2xl rounded-2xl bg-white shadow-2xl"
          >
            <header className="flex items-start justify-between border-b border-slate-200 px-6 py-5">
              <div>
                <h2 id="add-project-title" className="text-xl font-bold text-slate-950">
                  Add new project
                </h2>
                <p className="mt-1 text-sm text-slate-500">
                  Create the project scope used by issues and inspection reports.
                </p>
              </div>
              <button
                type="button"
                aria-label="Close"
                className="rounded-lg p-2 text-slate-500 hover:bg-slate-100"
                onClick={close}
              >
                <X className="size-5" />
              </button>
            </header>

            <form
              className="grid gap-5 p-6"
              onSubmit={handleSubmit((values) =>
                createProject.mutate({
                  ...values,
                  code: values.code.toUpperCase(),
                  description: values.description || undefined,
                  startDate: values.startDate || undefined,
                  endDate: values.endDate || undefined,
                }),
              )}
            >
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Project code" error={errors.code?.message}>
                  <Input
                    {...register("code")}
                    placeholder="NZE-LHR"
                    autoFocus
                  />
                </Field>
                <Field label="Status" error={errors.status?.message}>
                  <Select {...register("status")}>
                    <option value="PLANNING">Planning</option>
                    <option value="ACTIVE">Active</option>
                    <option value="ON_HOLD">On hold</option>
                  </Select>
                </Field>
              </div>
              <Field label="Project name" error={errors.name?.message}>
                <Input
                  {...register("name")}
                  placeholder="Net Zero Energy Building Lahore"
                />
              </Field>
              <Field label="Description (optional)" error={errors.description?.message}>
                <Textarea
                  {...register("description")}
                  placeholder="Briefly describe the project scope."
                />
              </Field>
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Start date (optional)" error={errors.startDate?.message}>
                  <Input type="date" {...register("startDate")} />
                </Field>
                <Field label="End date (optional)" error={errors.endDate?.message}>
                  <Input type="date" {...register("endDate")} />
                </Field>
              </div>
              {errors.root?.message && (
                <p role="alert" className="rounded-lg bg-red-50 p-3 text-sm text-red-800">
                  {errors.root.message}
                </p>
              )}
              <footer className="flex justify-end gap-3 border-t border-slate-100 pt-5">
                <Button type="button" variant="secondary" onClick={close}>
                  Cancel
                </Button>
                <Button type="submit" disabled={createProject.isPending}>
                  {createProject.isPending ? "Creating…" : "Create project"}
                </Button>
              </footer>
            </form>
          </section>
        </div>
      )}
    </>
  );
}
