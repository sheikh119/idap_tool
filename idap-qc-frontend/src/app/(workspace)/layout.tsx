import { AppShell } from "@/components/layout/app-shell";
import { Suspense, type ReactNode } from "react";

export default function WorkspaceLayout({ children }: { children: ReactNode }) {
  return (
    <Suspense fallback={<div className="min-h-screen bg-slate-50" />}>
      <AppShell>{children}</AppShell>
    </Suspense>
  );
}
