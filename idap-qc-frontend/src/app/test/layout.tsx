import type { Metadata } from "next";
import Link from "next/link";
import type { ReactNode } from "react";
import { ActorSwitcher } from "./_components/actor-switcher";

export const metadata: Metadata = { title: "API Test Bench" };

const LINKS = [
  { href: "/test", label: "Overview" },
  { href: "/test/api", label: "API console" },
  { href: "/test/users", label: "Users & access" },
  { href: "/test/projects", label: "Projects & locations" },
  { href: "/test/catalogue", label: "Generic issues" },
  { href: "/test/issues", label: "Issues" },
  { href: "/test/reports", label: "Reports" },
  { href: "/test/dashboard", label: "Dashboard" },
  { href: "/test/settings", label: "Settings" },
];

export default function TestLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-slate-100 lg:grid lg:grid-cols-[17rem_1fr]">
      <aside className="border-b border-slate-200 bg-white p-4 lg:sticky lg:top-0 lg:h-screen lg:border-r lg:border-b-0">
        <p className="text-sm font-bold text-teal-800">IDAP QC · Test bench</p>
        <p className="mt-1 text-xs text-slate-500">Development only. Talks to Supabase through /api.</p>
        <div className="mt-4">
          <ActorSwitcher />
        </div>
        <nav className="mt-4 flex flex-wrap gap-1 lg:grid">
          {LINKS.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="rounded-md px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100"
            >
              {link.label}
            </Link>
          ))}
        </nav>
      </aside>
      <main className="grid content-start gap-6 p-4 lg:p-8">{children}</main>
    </div>
  );
}
