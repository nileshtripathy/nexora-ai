import Link from "next/link";
import { EmptyState, PageHeader } from "@/components/admin/ui";
import { listConversations } from "@/lib/admin/queries";
import { fmtDate } from "@/lib/utils";

export default async function ConversationsPage({ searchParams }: { searchParams: Promise<{ page?: string }> }) {
  const page = Math.max(1, Number((await searchParams).page) || 1);
  const { rows, total, pages } = await listConversations(page);

  return (
    <>
      <PageHeader title="Conversations" subtitle={`${total} total`} />
      {rows.length === 0 ? <EmptyState title="No conversations yet" hint="Conversations appear here as soon as a customer sends a message." /> : (
        <>
          <ul className="divide-y rounded-xl border text-sm">
            {rows.map((c) => (
              <li key={c.id}>
                <Link href={`/admin/conversations/${c.id}`} className="flex flex-wrap items-center gap-x-4 gap-y-1 px-3 py-3 hover:bg-muted/50">
                  <span className="min-w-0 flex-1 truncate font-medium">{c.title}</span>
                  <span className="text-xs text-muted-foreground">{c.user.email}</span>
                  <span className="text-xs text-muted-foreground">{c._count.messages} msgs{c._count.tickets ? ` · ${c._count.tickets} ticket(s)` : ""}</span>
                  <span className="text-xs text-muted-foreground">{fmtDate(c.updatedAt)}</span>
                </Link>
              </li>
            ))}
          </ul>
          {pages > 1 && (
            <div className="mt-4 flex items-center justify-between text-sm">
              {page > 1 ? <Link className="underline" href={`?page=${page - 1}`}>← Newer</Link> : <span />}
              <span className="text-muted-foreground">Page {page} of {pages}</span>
              {page < pages ? <Link className="underline" href={`?page=${page + 1}`}>Older →</Link> : <span />}
            </div>
          )}
        </>
      )}
    </>
  );
}
