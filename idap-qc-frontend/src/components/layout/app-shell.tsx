"use client";

import { ClipboardCheck, FileText, FolderKanban, LayoutDashboard, Library, Menu, Settings, X } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, type ReactNode } from "react";
import { cn } from "@/lib/cn";

const navigation = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/projects", label: "Projects", icon: FolderKanban },
  { href: "/projects/p1/issues", label: "Issues", icon: ClipboardCheck },
  { href: "/projects/p1/reports", label: "Reports", icon: FileText },
  { href: "/catalogue/issues", label: "Issue catalogue", icon: Library },
  { href: "/admin", label: "Administration", icon: Settings },
];

export function AppShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  const sidebar = (
    <>
      <div className="flex h-16 items-center justify-between border-b border-slate-800 px-5">
        <Link href="/dashboard" className="flex items-center gap-3 font-bold text-white" onClick={() => setOpen(false)}>
          <span className="grid size-9 place-items-center rounded-lg bg-teal-500 text-sm text-slate-950">QC</span>
          <span>IDAP Reporting</span>
        </Link>
        <button className="lg:hidden" aria-label="Close navigation" onClick={() => setOpen(false)}><X /></button>
      </div>
      <nav className="grid gap-1 p-3">
        {navigation.map(({ href, label, icon: Icon }) => {
          const active = pathname === href || (href !== "/dashboard" && pathname.startsWith(`${href}/`));
          return (
            <Link
              key={href}
              href={href}
              onClick={() => setOpen(false)}
              className={cn("flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition", active ? "bg-teal-500 text-slate-950" : "text-slate-300 hover:bg-slate-800 hover:text-white")}
            >
              <Icon className="size-4" />
              {label}
            </Link>
          );
        })}
      </nav>
    </>
  );

  return (
    <div className="min-h-screen bg-slate-50">
      <aside className="fixed inset-y-0 left-0 z-40 hidden w-64 bg-slate-950 lg:block">{sidebar}</aside>
      {open && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <button aria-label="Close navigation overlay" className="absolute inset-0 bg-black/50" onClick={() => setOpen(false)} />
          <aside className="relative h-full w-72 bg-slate-950">{sidebar}</aside>
        </div>
      )}
      <div className="lg:pl-64">
        <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-slate-200 bg-white/95 px-4 backdrop-blur sm:px-6">
          <button className="rounded-lg p-2 hover:bg-slate-100 lg:hidden" aria-label="Open navigation" onClick={() => setOpen(true)}><Menu /></button>
          <div className="hidden text-sm text-slate-500 sm:block">Quality Control Workspace</div>
          <div className="flex items-center gap-3">
            <div className="text-right">
              <p className="text-sm font-semibold text-slate-900">Ahsan Khan</p>
              <p className="text-xs text-slate-500">QC Engineer</p>
            </div>
            <span className="grid size-9 place-items-center rounded-full bg-teal-100 text-sm font-bold text-teal-800">AK</span>
          </div>
        </header>
        <main className="mx-auto max-w-7xl p-4 sm:p-6 lg:p-8">{children}</main>
      </div>
    </div>
  );
}
