import Link from "next/link";
import { Badge, EmptyState, PageHeader, statusTone } from "@/components/admin/ui";
import { TicketStatusSelect } from "@/components/admin/ticket-status-select";
import { listTickets } from "@/lib/admin/queries";
import { cn, fmtDate } from "@/lib/utils";

const FILTERS = [["", "All"], ["OPEN", "Open"], ["IN_PROGRESS", "In progress"], ["RESOLVED", "Resolved"], ["CLOSED", "Closed"]];

export default async function TicketsPage({ searchParams }: { searchParams: Promise<{ status?: string }> }) {
  const { status = "" } = await searchParams;
  const tickets = await listTickets(status);

  return (
    <>
      <PageHeader title="Support tickets" subtitle="Created by the assistant when a customer needs a human" />
      <div className="mb-4 flex flex-wrap gap-2">
        {FILTERS.map(([v, label]) => (
          <Link key={v} href={v ? `?status=${v}` : "?"} className={cn("rounded-full border px-3 py-1 text-xs", status === v ? "border-primary bg-primary/10 font-medium" : "hover:bg-muted")}>{label}</Link>
        ))}
      </div>
      {tickets.length === 0 ? <EmptyState title="No tickets here" hint={status ? "Try a different status filter." : "When the assistant escalates a customer, the ticket appears here."} /> : (
        <ul className="divide-y rounded-xl border">
          {tickets.map((t) => (
            <li key={t.id} className="space-y-1 px-3 py-3 text-sm">
              <div className="flex flex-wrap items-center gap-3">
                <Badge tone={statusTone(t.status)}>{t.status.replace("_", " ").toLowerCase()}</Badge>
                <Badge>{t.priority.toLowerCase()}</Badge>
                <span className="min-w-0 flex-1 truncate font-medium">{t.subject}</span>
                <TicketStatusSelect id={t.id} status={t.status} />
              </div>
              <p className="line-clamp-2 text-muted-foreground">{t.description}</p>
              <p className="text-xs text-muted-foreground">
                {t.user.email} · {fmtDate(t.createdAt)}{t.conversationId && <> · <Link className="underline" href={`/admin/conversations/${t.conversationId}`}>view conversation</Link></>}
              </p>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
