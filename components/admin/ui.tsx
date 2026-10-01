import type { ReactNode } from "react";
import { Inbox } from "lucide-react";
import { cn } from "@/lib/utils";

export const PageHeader = ({ title, subtitle, children }: { title: string; subtitle?: string; children?: ReactNode }) => (
  <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
    <div>
      <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
      {subtitle && <p className="mt-1 text-sm text-muted-foreground">{subtitle}</p>}
    </div>
    {children}
  </div>
);

export const StatCard = ({ label, value, hint }: { label: string; value: ReactNode; hint?: string }) => (
  <div className="rounded-xl border p-4">
    <p className="text-xs font-medium text-muted-foreground">{label}</p>
    <p className="mt-1 text-2xl font-semibold tabular-nums">{value}</p>
    {hint && <p className="mt-0.5 text-xs text-muted-foreground">{hint}</p>}
  </div>
);

const TONES = {
  green: "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400",
  red: "bg-red-500/15 text-red-600 dark:text-red-400",
  amber: "bg-amber-500/15 text-amber-600 dark:text-amber-400",
  blue: "bg-sky-500/15 text-sky-600 dark:text-sky-400",
  gray: "bg-muted text-muted-foreground",
};
export const Badge = ({ tone = "gray", children }: { tone?: keyof typeof TONES; children: ReactNode }) => (
  <span className={cn("inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium", TONES[tone])}>{children}</span>
);

export const statusTone = (s: string): keyof typeof TONES => ({ OPEN: "amber", IN_PROGRESS: "blue", RESOLVED: "green", CLOSED: "gray" } as const)[s as "OPEN"] ?? "gray";

export const EmptyState = ({ title, hint }: { title: string; hint?: string }) => (
  <div className="flex flex-col items-center gap-2 rounded-xl border border-dashed px-6 py-12 text-center">
    <Inbox className="h-6 w-6 text-muted-foreground" />
    <p className="font-medium">{title}</p>
    {hint && <p className="max-w-sm text-sm text-muted-foreground">{hint}</p>}
  </div>
);

export const Section = ({ title, children }: { title: string; children: ReactNode }) => (
  <section className="space-y-2">
    <h2 className="text-sm font-semibold">{title}</h2>
    {children}
  </section>
);

export const Pre = ({ value }: { value: unknown }) => (
  <pre className="max-h-48 overflow-auto rounded-lg bg-muted p-2 text-xs leading-relaxed">{typeof value === "string" ? value : JSON.stringify(value, null, 2)}</pre>
);
