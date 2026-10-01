import { Badge, EmptyState, PageHeader, Section, StatCard, statusTone } from "@/components/admin/ui";
import { getOverview } from "@/lib/admin/queries";
import { fmtDate } from "@/lib/utils";
import Link from "next/link";

const pct = (n: number | null) => (n == null ? "—" : `${Math.round(n * 100)}%`);

export default async function AdminOverview() {
  const o = await getOverview(30);
  const maxCalls = Math.max(1, ...o.tools.map((t) => t.calls));

  return (
    <>
      <PageHeader title="Overview" subtitle={`Last ${o.days} days`} />
      <div className="mb-8 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard label="Conversations" value={o.conversations} hint={`${o.questions} customer messages`} />
        <StatCard label="Open tickets" value={o.openTickets} hint="all time, open + in progress" />
        <StatCard label="Tool calls" value={o.totalToolCalls} hint={`${o.tools.reduce((n, t) => n + t.failures, 0)} failed`} />
        <StatCard label="Registered users" value={o.users} />
      </div>

      <div className="grid gap-8 lg:grid-cols-2">
        <Section title="RAG usage">
          <div className="grid grid-cols-3 gap-3">
            <StatCard label="Answers grounded" value={pct(o.rag.hitRate)} hint={`${o.rag.withSources} of ${o.rag.answers}`} />
            <StatCard label="Avg top match" value={pct(o.rag.avgTopScore)} />
            <StatCard label="Avg latency" value={o.rag.avgLatencyMs == null ? "—" : `${(o.rag.avgLatencyMs / 1000).toFixed(1)}s`} />
          </div>
          {o.topDocs.length === 0 ? <EmptyState title="No retrievals yet" hint="Documents appear here once customers start asking questions." /> : (
            <ul className="divide-y rounded-xl border text-sm">
              {o.topDocs.map((d) => (
                <li key={d.title} className="flex items-center justify-between gap-3 px-3 py-2">
                  <span className="truncate">{d.title}</span>
                  <span className="shrink-0 text-xs text-muted-foreground">{d.hits} retrievals · {pct(d.avgScore)} avg match</span>
                </li>
              ))}
            </ul>
          )}
        </Section>

        <Section title="Tool usage">
          {o.tools.length === 0 ? <EmptyState title="No tool calls yet" hint="Ask the assistant about an order to see lookups appear here." /> : (
            <ul className="space-y-3 rounded-xl border p-3">
              {o.tools.map((t) => (
                <li key={t.tool} className="text-sm">
                  <div className="mb-1 flex justify-between"><span className="font-medium">{t.tool}</span><span className="text-xs text-muted-foreground">{t.calls} calls{t.failures ? ` · ${t.failures} failed` : ""}</span></div>
                  <div className="h-2 overflow-hidden rounded-full bg-muted"><div className="h-full rounded-full bg-primary" style={{ width: `${(t.calls / maxCalls) * 100}%` }} /></div>
                </li>
              ))}
            </ul>
          )}
        </Section>
      </div>

      <div className="mt-8">
        <Section title="Recent tickets">
          {o.recentTickets.length === 0 ? <EmptyState title="No tickets yet" hint="Tickets created by the assistant show up here." /> : (
            <ul className="divide-y rounded-xl border text-sm">
              {o.recentTickets.map((t) => (
                <li key={t.id} className="flex flex-wrap items-center gap-3 px-3 py-2">
                  <Badge tone={statusTone(t.status)}>{t.status.replace("_", " ").toLowerCase()}</Badge>
                  <span className="min-w-0 flex-1 truncate">{t.subject}</span>
                  <span className="text-xs text-muted-foreground">{t.user.email} · {fmtDate(t.createdAt)}</span>
                </li>
              ))}
            </ul>
          )}
          <Link href="/admin/tickets" className="text-sm underline">All tickets</Link>
        </Section>
      </div>
    </>
  );
}
