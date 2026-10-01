import Link from "next/link";
import { notFound } from "next/navigation";
import { z } from "zod";
import { Badge, PageHeader, Pre, statusTone } from "@/components/admin/ui";
import { getConversationTrace } from "@/lib/admin/queries";
import { fmtDate } from "@/lib/utils";

const Step = ({ label, children }: { label: string; children: React.ReactNode }) => (
  <div className="grid gap-1 sm:grid-cols-[110px_1fr] sm:gap-3">
    <p className="pt-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">{label}</p>
    <div className="min-w-0 space-y-2">{children}</div>
  </div>
);

export default async function ConversationInspector({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!z.string().uuid().safeParse(id).success) notFound();
  const c = await getConversationTrace(id);
  if (!c) notFound();

  return (
    <>
      <Link href="/admin/conversations" className="text-sm text-muted-foreground underline">← Conversations</Link>
      <PageHeader title={c.title} subtitle={`${c.user.name ?? c.user.email} · started ${fmtDate(c.createdAt)}`} />
      {c.tickets.length > 0 && (
        <p className="mb-4 flex flex-wrap items-center gap-2 text-sm">Tickets: {c.tickets.map((t) => <Badge key={t.id} tone={statusTone(t.status)}>{t.subject}</Badge>)}</p>
      )}

      <ol className="space-y-6">
        {c.turns.map((t, i) => (
          <li key={i} className="space-y-3 rounded-xl border p-4">
            {t.user && <Step label="User"><p className="whitespace-pre-wrap rounded-lg bg-muted px-3 py-2 text-sm">{t.user.content}</p></Step>}
            {t.assistant ? (
              <>
                <Step label="Retrieved context">
                  {t.assistant.trace && <p className="text-xs text-muted-foreground">Query: “{t.assistant.trace.query.slice(0, 160)}” · {t.assistant.trace.retrieved} chunk(s){t.assistant.trace.injectionFlagged ? " · flagged as possible prompt injection" : ""}</p>}
                  {t.assistant.sources.length === 0 ? <p className="text-sm text-muted-foreground">Nothing relevant retrieved — the assistant had no documents to answer from.</p> : t.assistant.sources.map((s) => (
                    <div key={s.index} className="rounded-lg border p-2 text-sm">
                      <p className="font-medium">[{s.index}] {s.title} <span className="text-xs font-normal text-muted-foreground">· {Math.round(s.score * 100)}% match</span></p>
                      <p className="mt-1 text-xs text-muted-foreground">{s.snippet}…</p>
                    </div>
                  ))}
                </Step>
                <Step label="Tool calls">
                  {t.assistant.toolCalls.length === 0 ? <p className="text-sm text-muted-foreground">None</p> : t.assistant.toolCalls.map((tc, j) => (
                    <div key={j} className="space-y-1 rounded-lg border p-2">
                      <p className="flex items-center gap-2 text-sm font-medium">{tc.name}<Badge tone={tc.state === "output-available" && (tc.output as { ok?: boolean })?.ok !== false ? "green" : "red"}>{tc.state === "output-available" && (tc.output as { ok?: boolean })?.ok === false ? "returned failure" : tc.state}</Badge></p>
                      <Pre value={{ input: tc.input, ...(tc.errorText ? { error: tc.errorText } : { output: tc.output }) }} />
                    </div>
                  ))}
                </Step>
                <Step label="AI response">
                  <p className="whitespace-pre-wrap text-sm">{t.assistant.content || "(tool-only response)"}</p>
                  {t.assistant.trace && <p className="text-xs text-muted-foreground">{t.assistant.trace.model} · {(t.assistant.trace.latencyMs / 1000).toFixed(1)}s · {fmtDate(t.assistant.at)}</p>}
                </Step>
              </>
            ) : <Step label="AI response"><p className="text-sm text-amber-600">No response was saved for this message (the request failed or was interrupted).</p></Step>}
          </li>
        ))}
      </ol>
    </>
  );
}
