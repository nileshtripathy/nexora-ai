import type { ReactNode } from "react";
import { getToolName, type ToolUIPart } from "ai";
import { AlertCircle, Check, Loader2, Package, Ticket, User, Wrench, type LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

type Result = Record<string, any> & { ok?: boolean; message?: string };
type Input = Record<string, any> | undefined;

/** Friendly copy per tool. Unknown tools fall back to a generic row, so new tools work without touching this file. */
const TOOLS: Record<string, { icon: LucideIcon; running: (i: Input) => string; done: (r: Result) => string; detail?: (r: Result) => ReactNode }> = {
  getOrderStatus: {
    icon: Package,
    running: (i) => `Checking order ${i?.orderId ?? ""}…`,
    done: (r) => `Order ${r.orderNumber} · ${String(r.status).toLowerCase()}`,
    detail: (r) => (
      <>
        <p>{(r.items as { name: string; quantity: number }[]).map((i) => `${i.quantity}× ${i.name}`).join(", ")} · {r.total}</p>
        {r.trackingNumber && <p>{r.carrier} · tracking {r.trackingNumber}</p>}
        {r.estimatedDelivery && !r.deliveredAt && <p>Estimated delivery {new Date(r.estimatedDelivery).toLocaleDateString("en-US", { timeZone: "UTC", dateStyle: "medium" })}</p>}
      </>
    ),
  },
  getCustomerAccount: {
    icon: User,
    running: () => "Looking up your account…",
    done: () => "Looked up your account",
    detail: (r) => <p>{r.recentOrders.length} recent order(s) · {r.openTickets} open ticket(s)</p>,
  },
  createSupportTicket: {
    icon: Ticket,
    running: () => "Creating a support ticket…",
    done: (r) => (r.duplicate ? `Ticket ${r.ticketNumber} already open` : `Ticket ${r.ticketNumber} created`),
    detail: (r) => <p>{r.subject}</p>,
  },
};

export function ToolCard({ part }: { part: ToolUIPart }) {
  const name = getToolName(part);
  const meta = TOOLS[name] ?? { icon: Wrench, running: () => "Working on it…", done: () => "Done" };
  const Icon = meta.icon;
  const running = part.state === "input-streaming" || part.state === "input-available";
  const result = part.state === "output-available" ? (part.output as Result) : undefined;
  const failed = part.state === "output-error" || result?.ok === false;

  const label = running
    ? meta.running(part.input as Input)
    : failed
      ? "Couldn't complete that lookup"
      : meta.done(result as Result);

  return (
    <div className={cn("rounded-xl border px-3 py-2 text-sm", failed ? "border-amber-500/40 bg-amber-500/10" : "bg-muted/40")} role="status">
      <div className="flex items-center gap-2">
        <Icon className="h-4 w-4 shrink-0 text-muted-foreground" />
        <span className="font-medium">{label}</span>
        <span className="ml-auto">
          {running ? <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" /> : failed ? <AlertCircle className="h-4 w-4 text-amber-500" /> : <Check className="h-4 w-4 text-primary" />}
        </span>
      </div>
      {failed && <p className="mt-1 text-xs text-muted-foreground">{result?.message ?? "Something went wrong on our side."}</p>}
      {!running && !failed && result && meta.detail && <div className="mt-1 space-y-0.5 text-xs text-muted-foreground">{meta.detail(result)}</div>}
    </div>
  );
}
