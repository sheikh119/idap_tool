"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api, query } from "./client";

/* eslint-disable @typescript-eslint/no-explicit-any */
export type Row = Record<string, any>;
/* eslint-enable @typescript-eslint/no-explicit-any */

export type Page<T = Row> = { items: T[]; total: number; limit: number; offset: number };

const fresh = { staleTime: 0 };

export function useUsers() {
  return useQuery({ queryKey: ["users"], queryFn: () => api<Row[]>("/users"), ...fresh });
}

export function useProjects() {
  return useQuery({ queryKey: ["projects"], queryFn: () => api<Row[]>("/projects"), ...fresh });
}

export function usePackages(projectId?: string) {
  return useQuery({
    queryKey: ["packages", projectId],
    queryFn: () => api<Row[]>(`/projects/${projectId}/packages`),
    enabled: Boolean(projectId),
    ...fresh,
  });
}

export function useLocations(projectId?: string) {
  return useQuery({
    queryKey: ["locations", projectId],
    queryFn: () => api<Row[]>(`/projects/${projectId}/locations`),
    enabled: Boolean(projectId),
    ...fresh,
  });
}

export function useTemplates() {
  return useQuery({ queryKey: ["templates"], queryFn: () => api<Row[]>("/report-templates"), ...fresh });
}

export function useCategories() {
  return useQuery({ queryKey: ["categories"], queryFn: () => api<Row[]>("/catalogue/categories"), ...fresh });
}

export function useGenericIssues(params: Record<string, string | undefined> = {}) {
  return useQuery({
    queryKey: ["generic-issues", params],
    queryFn: () => api<Row[]>(`/catalogue/generic-issues${query(params)}`),
    ...fresh,
  });
}

/** Mutation that refreshes every cached query on success, so all panels stay in sync. */
export function useApiMutation<TVariables, TResult = Row>(fn: (variables: TVariables) => Promise<TResult>) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: fn,
    onSuccess: () => queryClient.invalidateQueries(),
  });
}
