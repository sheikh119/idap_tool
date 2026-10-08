"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useCallback } from "react";
import type { DashboardFilters } from "@/types/domain";

export function useDashboardFilters() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const setFilters = useCallback(
    ({ projectId, packageId }: DashboardFilters) => {
      const params = new URLSearchParams();
      if (projectId) params.set("project", projectId);
      if (packageId) params.set("package", packageId);
      const query = params.toString();
      router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false });
    },
    [pathname, router],
  );

  return {
    requestedProjectId: searchParams.get("project") ?? undefined,
    requestedPackageId: searchParams.get("package") ?? undefined,
    setFilters,
  };
}
