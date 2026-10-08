import { Button, Card, Field, Input } from "@/components/ui";
import { ShieldCheck } from "lucide-react";

export default function LoginPage() {
  return <main className="grid min-h-screen place-items-center bg-slate-950 p-4"><Card className="w-full max-w-md p-7"><span className="grid size-12 place-items-center rounded-xl bg-teal-100 text-teal-800"><ShieldCheck /></span><h1 className="mt-5 text-2xl font-bold">Sign in to IDAP QC</h1><p className="mt-1 text-sm text-slate-500">Use your organization credentials.</p><form className="mt-6 grid gap-4"><Field label="Email"><Input type="email" autoComplete="email" /></Field><Field label="Password"><Input type="password" autoComplete="current-password" /></Field><Button type="submit">Sign in</Button></form><p className="mt-5 text-xs text-slate-500">Authentication is connected through the replaceable backend session adapter.</p></Card></main>;
}
