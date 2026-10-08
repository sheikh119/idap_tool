import { AlertCircle, RotateCw, type LucideIcon } from "lucide-react";
import type { ReactNode } from "react";
import { Button, Card } from "@/components/ui";
import { cn } from "@/lib/cn";

export function EmptyState({
  icon: Icon,
  title,
  description,
  actions,
  className,
}: {
  icon: LucideIcon;
  title: string;
  description: string;
  actions?: ReactNode;
  className?: string;
}) {
  return (
    <Card className={cn("flex flex-col items-center px-6 py-12 text-center", className)}>
      <span className="grid size-14 place-items-center rounded-2xl bg-teal-50 text-teal-700">
        <Icon className="size-7" />
      </span>
      <h2 className="mt-4 text-lg font-semibold text-slate-950">{title}</h2>
      <p className="mt-1 max-w-md text-sm text-slate-500">{description}</p>
      {actions && <div className="mt-6 flex flex-wrap justify-center gap-3">{actions}</div>}
    </Card>
  );
}

export function ErrorState({
  title = "Something went wrong",
  description,
  onRetry,
  retrying = false,
  className,
}: {
  title?: string;
  description: string;
  onRetry?: () => void;
  retrying?: boolean;
  className?: string;
}) {
  return (
    <Card role="alert" className={cn("flex flex-col items-center border-red-200 px-6 py-12 text-center", className)}>
      <span className="grid size-14 place-items-center rounded-2xl bg-red-50 text-red-700">
        <AlertCircle className="size-7" />
      </span>
      <h2 className="mt-4 text-lg font-semibold text-slate-950">{title}</h2>
      <p className="mt-1 max-w-md text-sm text-slate-500">{description}</p>
      {onRetry && (
        <Button className="mt-6" variant="secondary" onClick={onRetry} disabled={retrying}>
          <RotateCw className={cn("mr-2 size-4", retrying && "animate-spin")} />
          {retrying ? "Retrying…" : "Try again"}
        </Button>
      )}
    </Card>
  );
}
